/**
 * Background sync worker — drains @caltrack/sync-queue to Supabase.
 *
 * Conflict policy (known limitation): last-write-wins via upsert on stable
 * client UUIDs. No multi-device merge; single-user / single-device assumed.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { AppState, type AppStateStatus, type NativeEventSubscription } from 'react-native';
import type { CalorieEntry, UserProfile } from '../types';
import type { FoodItem } from '../types/food';
import type { TargetSnapshot } from '../types/targetHistory';
import type { WorkoutEntry } from '../types/workout';
import type { WeightEntry } from '../types/weight';
import {
  getLocalStoreGeneration,
  localApplyRemoteSnapshot,
  localGetHydratedUserId,
  localGetProfile,
  localIsEmpty,
  resetLocalEntityStore,
  type LocalEntitySnapshot,
} from './localStore';
import { LOCAL_KEYS } from './localKeys';
import { getCachedAuthUser } from './authCache';
import { mergeRemoteIntoLocal } from './hydrateMerge';
import { resolveHydrateLocalPolicy } from './hydratePolicy';
import * as db from './supabaseData';
import { withTimeout } from '../utils/networkTimeout';
import { isTransientSyncError, syncErrorMessage } from '../utils/syncErrors';
import {
  GUEST_QUEUE_OWNER,
  SYNC_MAX_RETRIES,
  backoffSeconds,
  getNeedsAttention,
  getPendingCount,
  getSyncQueue,
  mutateSyncQueue,
  removeSyncItems,
  updateSyncItem,
  type SyncQueueItem,
} from './syncQueue';

export type SyncStatus = 'synced' | 'pending' | 'needsAttention';

export interface SyncStatusSnapshot {
  status: SyncStatus;
  pendingCount: number;
  attentionItems: SyncQueueItem[];
}

type StatusListener = (snapshot: SyncStatusSnapshot) => void;

/**
 * - hydrated: remote data was pulled and merged into the local store
 * - skipped: this user is already hydrated on this device
 * - no-user: nobody is signed in
 * - failed: the remote fetch failed (will be retried on a later trigger)
 * - stale: the local store was reset (sign-out) mid-hydration; result dropped
 */
export type HydrateResult = 'hydrated' | 'skipped' | 'no-user' | 'failed' | 'stale';

type HydrateListener = (result: HydrateResult) => void;

const PERIODIC_MS = 45_000;
const HYDRATE_FETCH_TIMEOUT_MS = 20_000;
/** Belt-and-braces on top of the fetch timeout in lib/supabase. */
const ITEM_TIMEOUT_MS = 30_000;
/** Background triggers won't re-attempt a failed hydration more often than this. */
const HYDRATE_RETRY_THROTTLE_MS = 30_000;
/** Give "needs attention" items one more attempt at most this often. */
const ATTENTION_RETRY_MIN_INTERVAL_MS = 60_000;
/** Upper bound on back-to-back drain passes requested while draining. */
const MAX_DRAIN_PASSES = 5;
const DEFAULT_FLUSH_TIMEOUT_MS = 10_000;

async function resolveLocalUserId(): Promise<string | null> {
  const sessionUserId = await db.tryGetSessionUserId();
  if (sessionUserId) {
    return sessionUserId;
  }
  const cached = await getCachedAuthUser();
  return cached?.id ?? null;
}

/** Single in-flight drain; requests while it runs coalesce into one more pass. */
let drainPromise: Promise<void> | null = null;
let drainAgain = false;
/** Single in-flight hydration shared by every caller. */
let hydratePromise: Promise<HydrateResult> | null = null;
let lastHydrateFailureAt = 0;
let lastAttentionRetryAt = 0;
let lastConnected: boolean | null = null;
let started = false;
let periodicTimer: ReturnType<typeof setInterval> | null = null;
let appStateSub: NativeEventSubscription | null = null;
let netUnsub: (() => void) | null = null;
const listeners = new Set<StatusListener>();
const hydrateListeners = new Set<HydrateListener>();
let lastSnapshot: SyncStatusSnapshot = {
  status: 'synced',
  pendingCount: 0,
  attentionItems: [],
};

function emit(snapshot: SyncStatusSnapshot) {
  lastSnapshot = snapshot;
  listeners.forEach(listener => listener(snapshot));
}

function attentionKey(items: SyncQueueItem[]): string {
  return items
    .map(item => `${item.id}:${item.retryCount}:${item.lastError ?? ''}`)
    .join('|');
}

export function getSyncStatusSnapshot(): SyncStatusSnapshot {
  return lastSnapshot;
}

export function subscribeSyncStatus(listener: StatusListener): () => void {
  listeners.add(listener);
  listener(lastSnapshot);
  return () => {
    listeners.delete(listener);
  };
}

/** Notified after every hydration attempt (e.g. to reload the profile). */
export function subscribeHydration(listener: HydrateListener): () => void {
  hydrateListeners.add(listener);
  return () => {
    hydrateListeners.delete(listener);
  };
}

export async function refreshSyncStatus(): Promise<SyncStatusSnapshot> {
  const queue = await getSyncQueue();
  const attentionItems = getNeedsAttention(queue);
  const pendingCount = getPendingCount(queue);
  const snapshot: SyncStatusSnapshot = {
    status:
      attentionItems.length > 0
        ? 'needsAttention'
        : pendingCount > 0
          ? 'pending'
          : 'synced',
    pendingCount,
    attentionItems,
  };
  // Skip no-op emits so subscribers don't re-render on every drain.
  if (
    snapshot.status === lastSnapshot.status &&
    snapshot.pendingCount === lastSnapshot.pendingCount &&
    attentionKey(snapshot.attentionItems) ===
      attentionKey(lastSnapshot.attentionItems)
  ) {
    return lastSnapshot;
  }
  emit(snapshot);
  return snapshot;
}

async function processItem(item: SyncQueueItem): Promise<void> {
  switch (item.entity) {
    case 'profile': {
      const profile = item.payload.profile as UserProfile;
      await db.upsertProfile(profile);
      return;
    }
    case 'calorieEntry': {
      if (item.operation === 'delete') {
        await db.removeEntry(item.payload.id as string);
        return;
      }
      const date = item.payload.date as string;
      const entry = item.payload.entry as CalorieEntry;
      await db.upsertCalorieEntry(date, entry);
      return;
    }
    case 'customFood': {
      if (item.operation === 'delete') {
        await db.deleteCustomFoodRow(item.payload.id as string);
        return;
      }
      const food = item.payload.food as FoodItem;
      await db.upsertCustomFood(food);
      return;
    }
    case 'weightEntry': {
      if (item.operation === 'delete') {
        await db.deleteWeightEntryRow(item.payload.id as string);
        return;
      }
      const entry = item.payload.entry as WeightEntry;
      await db.upsertWeightEntryRemote(entry);
      return;
    }
    case 'targetHistory': {
      const snapshots = item.payload.snapshots as TargetSnapshot[];
      await db.replaceTargetHistoryRemote(snapshots);
      return;
    }
    case 'workoutEntry': {
      if (item.operation === 'delete') {
        await db.deleteWorkoutEntryRow(item.payload.id as string);
        return;
      }
      const date = item.payload.date as string;
      const entry = item.payload.entry as WorkoutEntry;
      await db.upsertWorkoutEntry(date, entry);
      return;
    }
    default:
      throw new Error(`Unknown sync entity: ${(item as SyncQueueItem).entity}`);
  }
}

async function fetchRemoteSnapshot(): Promise<LocalEntitySnapshot> {
  const [profile, logs, customFoods, weightEntries, targetHistory, workouts] =
    await withTimeout(
      Promise.all([
        db.fetchProfile(),
        db.fetchAllLogs(),
        db.fetchCustomFoods(),
        db.fetchWeightEntries(),
        db.fetchTargetHistory(),
        db.fetchAllWorkouts(),
      ]),
      HYDRATE_FETCH_TIMEOUT_MS,
      'Remote hydration timed out',
    );
  return { profile, logs, customFoods, weightEntries, targetHistory, workouts };
}

async function runHydration(): Promise<HydrateResult> {
  const userId = await resolveLocalUserId();
  if (!userId) {
    return 'no-user';
  }

  let generation = getLocalStoreGeneration();
  const hydratedFor = await localGetHydratedUserId();
  const empty = await localIsEmpty();
  const policy = resolveHydrateLocalPolicy(hydratedFor, userId, empty);

  if (policy === 'skip') {
    return 'skipped';
  }

  if (policy === 'reset-and-pull') {
    await resetLocalEntityStore();
    generation = getLocalStoreGeneration();
  }

  let remote: LocalEntitySnapshot;
  try {
    remote = await fetchRemoteSnapshot();
  } catch {
    // Don't mark hydrated: the next trigger must try the pull again. Local
    // writes made meanwhile are kept (claim-local merges them next time).
    return 'failed';
  }

  // Guest / offline data claimed into an account that already exists
  // (a completed onboarding — the signup trigger's placeholder row doesn't
  // count): the account's profile + target history win; logs etc. merge.
  const remoteWins =
    policy === 'claim-local' && Boolean(remote.profile?.onboardingComplete);

  const applied = await localApplyRemoteSnapshot(
    generation,
    userId,
    async current => {
      const queue = await mutateSyncQueue(items => {
        const next = items
          // Items queued by a different account can never be uploaded.
          .filter(
            item =>
              !item.ownerId ||
              item.ownerId === userId ||
              item.ownerId === GUEST_QUEUE_OWNER,
          )
          .filter(
            item =>
              !remoteWins ||
              (item.entity !== 'profile' && item.entity !== 'targetHistory'),
          )
          // Guest items are now this account's and stay queued for upload.
          .map(item =>
            item.ownerId === GUEST_QUEUE_OWNER ? { ...item, ownerId: userId } : item,
          );
        const changed =
          next.length !== items.length ||
          next.some((item, index) => item !== items[index]);
        return changed ? next : items;
      });
      return mergeRemoteIntoLocal(current, remote, queue, { remoteWins });
    },
  );

  if (!applied) {
    return 'stale';
  }

  if (remoteWins) {
    // Guest backfill ran against the guest profile; redo it for the account.
    await AsyncStorage.removeItem(LOCAL_KEYS.targetHistoryBackfillV1);
  }

  try {
    const profile = await localGetProfile();
    if (profile?.onboardingComplete) {
      const { backfillTargetHistoryIfNeeded } = await import(
        './targetHistoryService'
      );
      await backfillTargetHistoryIfNeeded(profile);
    }
  } catch {
    // Backfill is best-effort; it runs again on the next target lookup.
  }
  void import('./widgetSnapshot')
    .then(mod => mod.refreshHomeWidget())
    .catch(() => undefined);
  return 'hydrated';
}

/**
 * Pull remote → local for the current user when this device hasn't been
 * hydrated for them yet. Concurrent callers share one in-flight run.
 * Guest / unclaimed local data is merged into the account (see hydrateMerge).
 */
export function hydrateFromRemote(): Promise<HydrateResult> {
  if (hydratePromise) {
    return hydratePromise;
  }
  const run = runHydration()
    .catch((): HydrateResult => 'failed')
    .then(result => {
      lastHydrateFailureAt = result === 'failed' ? Date.now() : 0;
      hydrateListeners.forEach(listener => {
        try {
          listener(result);
        } catch {
          // Listener errors must not break hydration.
        }
      });
      if (result === 'hydrated') {
        // Claimed guest items can upload now.
        void drainSyncQueue();
      }
      return result;
    })
    .finally(() => {
      hydratePromise = null;
    });
  hydratePromise = run;
  return run;
}

export async function hydrateFromRemoteIfNeeded(): Promise<boolean> {
  return (await hydrateFromRemote()) === 'hydrated';
}

async function drainOnce(): Promise<void> {
  const net = await NetInfo.fetch();
  if (!net.isConnected) {
    return;
  }

  const userId = await resolveLocalUserId();
  if (!userId) {
    return;
  }

  // Never upload before this account's remote data has been pulled and
  // merged — otherwise a new device or claimed guest data overwrites it.
  if ((await localGetHydratedUserId()) !== userId) {
    if (Date.now() - lastHydrateFailureAt < HYDRATE_RETRY_THROTTLE_MS) {
      return;
    }
    await hydrateFromRemote();
    if ((await localGetHydratedUserId()) !== userId) {
      return;
    }
  }

  const queue = await getSyncQueue();
  const foreignIds = queue
    .filter(
      item =>
        item.ownerId &&
        item.ownerId !== userId &&
        item.ownerId !== GUEST_QUEUE_OWNER,
    )
    .map(item => item.id);
  if (foreignIds.length) {
    await removeSyncItems(foreignIds);
  }
  const foreign = new Set(foreignIds);
  const now = Date.now();

  for (const item of queue) {
    // Guest-tagged items are claimable: this user is hydrated on this device.
    if (foreign.has(item.id)) {
      continue;
    }
    if (item.retryCount >= SYNC_MAX_RETRIES) {
      continue;
    }
    if (item.nextRetryAt && Date.parse(item.nextRetryAt) > now) {
      continue;
    }

    try {
      await withTimeout(
        processItem(item),
        ITEM_TIMEOUT_MS,
        'Sync request timed out',
      );
      await removeSyncItems([item.id]);
    } catch (error) {
      // Offline / timeout / auth failures say nothing about the item: they
      // grow the backoff but don't count toward the needs-attention cap.
      const transient = isTransientSyncError(error);
      const retryCount = transient ? item.retryCount : item.retryCount + 1;
      const transientFailures = transient
        ? (item.transientFailures ?? 0) + 1
        : 0;
      const wait = backoffSeconds(retryCount + transientFailures);
      await updateSyncItem(item.id, {
        retryCount,
        transientFailures,
        nextRetryAt: new Date(Date.now() + wait * 1000).toISOString(),
        lastError: syncErrorMessage(error),
      });
      if (transient) {
        // The rest of the queue would fail the same way; try again later.
        break;
      }
    }
  }
}

export function drainSyncQueue(): Promise<void> {
  if (drainPromise) {
    drainAgain = true;
    return drainPromise;
  }

  const run = (async () => {
    try {
      let passes = 0;
      do {
        drainAgain = false;
        passes += 1;
        await drainOnce();
      } while (drainAgain && passes < MAX_DRAIN_PASSES);
    } catch {
      // Never leave the worker wedged; the next trigger retries.
    } finally {
      drainPromise = null;
      drainAgain = false;
      try {
        await refreshSyncStatus();
      } catch {
        // Status is cosmetic.
      }
    }
  })();
  drainPromise = run;
  return run;
}

/** Put parked items back in line: one more attempt each, with fresh backoff. */
async function releaseNeedsAttention(
  retryCount: number,
  includePending: boolean,
): Promise<void> {
  await mutateSyncQueue(queue => {
    const touch = (item: SyncQueueItem) =>
      item.retryCount >= SYNC_MAX_RETRIES ||
      (includePending && Boolean(item.nextRetryAt));
    if (!queue.some(touch)) {
      return queue;
    }
    return queue.map(item =>
      touch(item)
        ? {
            ...item,
            retryCount: Math.min(item.retryCount, retryCount),
            transientFailures: 0,
            nextRetryAt: undefined,
          }
        : item,
    );
  });
}

export async function retryFailedSync(): Promise<void> {
  await mutateSyncQueue(queue => {
    if (!getNeedsAttention(queue).length) {
      return queue;
    }
    return queue.map(item =>
      item.retryCount >= SYNC_MAX_RETRIES
        ? {
            ...item,
            retryCount: 0,
            transientFailures: 0,
            nextRetryAt: undefined,
            lastError: undefined,
          }
        : item,
    );
  });
  await drainSyncQueue();
}

/**
 * Try to upload everything now (including items parked as needs-attention),
 * e.g. right before sign-out. Waits up to `timeoutMs`, then returns how many
 * items are still unsynced.
 */
export async function flushSyncQueue(
  timeoutMs: number = DEFAULT_FLUSH_TIMEOUT_MS,
): Promise<number> {
  let remaining = 0;
  try {
    remaining = (await getSyncQueue()).length;
    if (!remaining) {
      return 0;
    }
    await releaseNeedsAttention(SYNC_MAX_RETRIES - 1, true);
    // An explicit flush may re-attempt a recently failed hydration.
    lastHydrateFailureAt = 0;
    await withTimeout(drainSyncQueue(), timeoutMs, 'Sync flush timed out');
  } catch {
    // Timed out or failed — report whatever is left.
  }
  try {
    remaining = (await getSyncQueue()).length;
  } catch {
    // Keep the last known count.
  }
  return remaining;
}

/** Foreground / network regained: one more shot for parked items (throttled). */
async function retryNeedsAttentionOnce(): Promise<void> {
  const now = Date.now();
  if (now - lastAttentionRetryAt < ATTENTION_RETRY_MIN_INTERVAL_MS) {
    return;
  }
  lastAttentionRetryAt = now;
  // retryCount MAX - 1: a single attempt; failing again parks it until the
  // next foreground, so this can't hot-loop.
  await releaseNeedsAttention(SYNC_MAX_RETRIES - 1, false);
}

function kickWithAttentionRetry() {
  void (async () => {
    try {
      await retryNeedsAttentionOnce();
    } catch {
      // Fall through to a normal drain.
    }
    await drainSyncQueue();
  })();
}

function onAppStateChange(state: AppStateStatus) {
  if (state === 'active') {
    kickWithAttentionRetry();
  }
}

export function startSyncWorker(): void {
  if (started) {
    return;
  }
  started = true;

  void (async () => {
    try {
      await hydrateFromRemote();
      await drainSyncQueue();
    } catch {
      // Later triggers (foreground, network, periodic) retry.
    }
  })();

  appStateSub = AppState.addEventListener('change', onAppStateChange);

  lastConnected = null;
  netUnsub = NetInfo.addEventListener(state => {
    const connected = Boolean(state.isConnected);
    const regained = connected && lastConnected === false;
    lastConnected = connected;
    if (regained) {
      kickWithAttentionRetry();
    } else if (connected) {
      void drainSyncQueue();
    }
  });

  periodicTimer = setInterval(() => {
    void drainSyncQueue();
  }, PERIODIC_MS);
}

export function stopSyncWorker(): void {
  started = false;
  appStateSub?.remove();
  appStateSub = null;
  netUnsub?.();
  netUnsub = null;
  lastConnected = null;
  if (periodicTimer) {
    clearInterval(periodicTimer);
    periodicTimer = null;
  }
}
