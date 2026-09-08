/**
 * Background sync worker — drains @caltrack/sync-queue to Supabase.
 *
 * Conflict policy (known limitation): last-write-wins via upsert on stable
 * client UUIDs. No multi-device merge; single-user / single-device assumed.
 */
import NetInfo from '@react-native-community/netinfo';
import { AppState, type AppStateStatus, type NativeEventSubscription } from 'react-native';
import type { CalorieEntry, UserProfile } from '../types';
import type { FoodItem } from '../types/food';
import type { TargetSnapshot } from '../types/targetHistory';
import type { WorkoutEntry } from '../types/workout';
import type { WeightEntry } from '../types/weight';
import {
  localGetHydratedUserId,
  localIsEmpty,
  localSaveAllLogs,
  localSaveCustomFoods,
  localSaveProfile,
  localSaveTargetHistory,
  localSaveAllWorkouts,
  localSaveWeightEntries,
  localSetHydratedUserId,
  resetLocalEntityStore,
} from './localStore';
import { getCachedAuthUser } from './authCache';
import { resolveHydrateLocalPolicy } from './hydratePolicy';
import * as db from './supabaseData';
import { withTimeout } from '../utils/networkTimeout';
import {
  SYNC_MAX_RETRIES,
  backoffSeconds,
  getNeedsAttention,
  getPendingCount,
  getSyncQueue,
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

const PERIODIC_MS = 45_000;
const HYDRATE_FETCH_TIMEOUT_MS = 8_000;

async function resolveLocalUserId(): Promise<string | null> {
  const sessionUserId = await db.tryGetSessionUserId();
  if (sessionUserId) {
    return sessionUserId;
  }
  const cached = await getCachedAuthUser();
  return cached?.id ?? null;
}

let draining = false;
let started = false;
let periodicTimer: ReturnType<typeof setInterval> | null = null;
let appStateSub: NativeEventSubscription | null = null;
let netUnsub: (() => void) | null = null;
const listeners = new Set<StatusListener>();
let lastSnapshot: SyncStatusSnapshot = {
  status: 'synced',
  pendingCount: 0,
  attentionItems: [],
};

function emit(snapshot: SyncStatusSnapshot) {
  lastSnapshot = snapshot;
  listeners.forEach(listener => listener(snapshot));
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

/**
 * Pull remote → local for the current user when local is empty.
 * Guest / unclaimed local data is kept and claimed for this account.
 */
export async function hydrateFromRemoteIfNeeded(): Promise<boolean> {
  const userId = await resolveLocalUserId();
  if (!userId) {
    return false;
  }

  const hydratedFor = await localGetHydratedUserId();
  const empty = await localIsEmpty();
  const policy = resolveHydrateLocalPolicy(hydratedFor, userId, empty);

  if (policy === 'skip') {
    return false;
  }

  // Guest / unclaimed local data: keep it and attach to this account.
  if (policy === 'claim-local') {
    await localSetHydratedUserId(userId);
    return false;
  }

  if (policy === 'reset-and-pull') {
    await resetLocalEntityStore();
  }

  try {
    const [profile, logs, foods, weights, targets, workouts] = await withTimeout(
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
    if (profile) {
      await localSaveProfile(profile);
    }
    await localSaveAllLogs(logs);
    await localSaveCustomFoods(foods);
    await localSaveWeightEntries(weights);
    await localSaveTargetHistory(targets);
    await localSaveAllWorkouts(workouts);
    await localSetHydratedUserId(userId);
    if (profile?.onboardingComplete) {
      const { backfillTargetHistoryIfNeeded } = await import(
        './targetHistoryService'
      );
      await backfillTargetHistoryIfNeeded(profile);
    }
    void import('./widgetSnapshot')
      .then(mod => mod.refreshHomeWidget())
      .catch(() => undefined);
    return true;
  } catch {
    // Claim this user so offline local writes aren't wiped as "orphaned".
    // Empty store + same userId still retries pull on the next call.
    await localSetHydratedUserId(userId);
    return false;
  }
}

export async function drainSyncQueue(): Promise<void> {
  if (draining) {
    return;
  }

  const net = await NetInfo.fetch();
  if (!net.isConnected) {
    await refreshSyncStatus();
    return;
  }

  const userId = await resolveLocalUserId();
  if (!userId) {
    await refreshSyncStatus();
    return;
  }

  draining = true;
  try {
    const queue = await getSyncQueue();
    const now = Date.now();

    for (const item of queue) {
      if (item.retryCount >= SYNC_MAX_RETRIES) {
        continue;
      }
      if (item.nextRetryAt && Date.parse(item.nextRetryAt) > now) {
        continue;
      }

      try {
        await processItem(item);
        await removeSyncItems([item.id]);
      } catch (error) {
        const retryCount = item.retryCount + 1;
        const wait = backoffSeconds(retryCount);
        const message =
          error instanceof Error ? error.message : 'Sync failed';
        await updateSyncItem(item.id, {
          retryCount,
          nextRetryAt: new Date(Date.now() + wait * 1000).toISOString(),
          lastError: message,
        });
      }
    }
  } finally {
    draining = false;
    await refreshSyncStatus();
  }
}

export async function retryFailedSync(): Promise<void> {
  const queue = await getSyncQueue();
  const failed = getNeedsAttention(queue);
  for (const item of failed) {
    await updateSyncItem(item.id, {
      retryCount: 0,
      nextRetryAt: undefined,
      lastError: undefined,
    });
  }
  await drainSyncQueue();
}

function onAppStateChange(state: AppStateStatus) {
  if (state === 'active') {
    void drainSyncQueue();
  }
}

export function startSyncWorker(): void {
  if (started) {
    return;
  }
  started = true;

  void (async () => {
    await hydrateFromRemoteIfNeeded();
    await drainSyncQueue();
  })();

  appStateSub = AppState.addEventListener('change', onAppStateChange);

  netUnsub = NetInfo.addEventListener(state => {
    if (state.isConnected) {
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
  if (periodicTimer) {
    clearInterval(periodicTimer);
    periodicTimer = null;
  }
}
