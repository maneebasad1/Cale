import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAsyncMutex } from '../utils/asyncMutex';
import { createId } from '../utils/id';
import { getCachedAuthUser } from './authCache';
import { getGuestMode } from './guestMode';
import { LOCAL_KEYS } from './localKeys';

export type SyncEntity =
  | 'calorieEntry'
  | 'weightEntry'
  | 'profile'
  | 'customFood'
  | 'targetHistory'
  | 'workoutEntry';

export type SyncOperation = 'create' | 'update' | 'delete';

/** Owner tag for items queued while no account is signed in. */
export const GUEST_QUEUE_OWNER = 'guest';

export interface SyncQueueItem {
  id: string;
  entity: SyncEntity;
  operation: SyncOperation;
  /** Opaque payload interpreted by the sync worker per entity. */
  payload: Record<string, unknown>;
  createdAt: string;
  retryCount: number;
  /** ISO timestamp — skip until this time (exponential backoff). */
  nextRetryAt?: string;
  lastError?: string;
  /**
   * Optional stable key for coalescing (e.g. entry id). When enqueueing
   * create/update for the same key, replace the prior pending item.
   */
  coalesceKey?: string;
  /**
   * User id (or GUEST_QUEUE_OWNER) that queued this item. Untagged items
   * (queued by older app versions) belong to whoever is signed in.
   */
  ownerId?: string;
  /**
   * Consecutive transient failures (offline / timeout / auth). These grow
   * the backoff but never count toward SYNC_MAX_RETRIES.
   */
  transientFailures?: number;
}

export const SYNC_MAX_RETRIES = 10;

/** Serializes every read-modify-write of the queue blob. Not re-entrant. */
const queueLock = createAsyncMutex();

async function readQueue(): Promise<SyncQueueItem[]> {
  const raw = await AsyncStorage.getItem(LOCAL_KEYS.syncQueue);
  if (!raw) {
    return [];
  }
  try {
    const parsed = JSON.parse(raw) as SyncQueueItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeQueue(queue: SyncQueueItem[]): Promise<void> {
  await AsyncStorage.setItem(LOCAL_KEYS.syncQueue, JSON.stringify(queue));
}

/**
 * Atomic read-modify-write of the whole queue. Return the same array to skip
 * the write. Don't call other queue mutators from inside `updater`.
 */
export async function mutateSyncQueue(
  updater: (queue: SyncQueueItem[]) => SyncQueueItem[],
): Promise<SyncQueueItem[]> {
  return queueLock.run(async () => {
    const queue = await readQueue();
    const next = updater(queue);
    if (next !== queue) {
      await writeQueue(next);
    }
    return next;
  });
}

export async function getSyncQueue(): Promise<SyncQueueItem[]> {
  return readQueue();
}

async function resolveQueueOwnerId(): Promise<string> {
  try {
    // Guest mode wins over a stale cached account left behind by an expired session.
    if (await getGuestMode()) {
      return GUEST_QUEUE_OWNER;
    }
    const cached = await getCachedAuthUser();
    return cached?.id ?? GUEST_QUEUE_OWNER;
  } catch {
    return GUEST_QUEUE_OWNER;
  }
}

export async function enqueueSync(
  item: Omit<SyncQueueItem, 'id' | 'createdAt' | 'retryCount'>,
): Promise<SyncQueueItem> {
  const ownerId = item.ownerId ?? (await resolveQueueOwnerId());
  const next: SyncQueueItem = {
    ...item,
    ownerId,
    id: createId(),
    createdAt: new Date().toISOString(),
    retryCount: 0,
  };

  await mutateSyncQueue(queue => {
    let updated = queue;
    if (item.coalesceKey) {
      updated = queue.filter(
        existing =>
          !(
            existing.entity === item.entity &&
            existing.coalesceKey === item.coalesceKey &&
            existing.operation !== 'delete'
          ),
      );
    }

    // A delete supersedes pending create/update for the same key.
    if (item.operation === 'delete' && item.coalesceKey) {
      updated = updated.filter(
        existing =>
          !(
            existing.entity === item.entity &&
            existing.coalesceKey === item.coalesceKey
          ),
      );
    }

    return [...updated, next];
  });

  // Kick the worker without awaiting — never block the local write path.
  // Concurrent kicks coalesce into a single drain in sync.ts.
  void import('./sync')
    .then(mod => {
      void mod.drainSyncQueue();
      void mod.refreshSyncStatus();
    })
    .catch(() => undefined);

  return next;
}

export async function removeSyncItems(ids: string[]): Promise<void> {
  if (!ids.length) {
    return;
  }
  const idSet = new Set(ids);
  await mutateSyncQueue(queue => {
    const filtered = queue.filter(item => !idSet.has(item.id));
    return filtered.length === queue.length ? queue : filtered;
  });
}

export async function updateSyncItem(
  id: string,
  patch: Partial<
    Pick<
      SyncQueueItem,
      'retryCount' | 'nextRetryAt' | 'lastError' | 'transientFailures'
    >
  >,
): Promise<void> {
  await mutateSyncQueue(queue => {
    if (!queue.some(item => item.id === id)) {
      return queue;
    }
    return queue.map(item => (item.id === id ? { ...item, ...patch } : item));
  });
}

export async function clearSyncQueue(): Promise<void> {
  await queueLock.run(() => AsyncStorage.removeItem(LOCAL_KEYS.syncQueue));
}

export function getPendingCount(queue: SyncQueueItem[]): number {
  return queue.filter(item => item.retryCount < SYNC_MAX_RETRIES).length;
}

export function getNeedsAttention(queue: SyncQueueItem[]): SyncQueueItem[] {
  return queue.filter(item => item.retryCount >= SYNC_MAX_RETRIES);
}

export function backoffSeconds(retryCount: number): number {
  return Math.min(2 ** retryCount, 60);
}
