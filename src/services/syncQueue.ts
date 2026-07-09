import AsyncStorage from '@react-native-async-storage/async-storage';
import { createId } from '../utils/id';
import { LOCAL_KEYS } from './localKeys';

export type SyncEntity =
  | 'calorieEntry'
  | 'weightEntry'
  | 'profile'
  | 'customFood';

export type SyncOperation = 'create' | 'update' | 'delete';

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
}

export const SYNC_MAX_RETRIES = 10;

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

export async function getSyncQueue(): Promise<SyncQueueItem[]> {
  return readQueue();
}

export async function enqueueSync(
  item: Omit<SyncQueueItem, 'id' | 'createdAt' | 'retryCount'>,
): Promise<SyncQueueItem> {
  const queue = await readQueue();
  const next: SyncQueueItem = {
    ...item,
    id: createId(),
    createdAt: new Date().toISOString(),
    retryCount: 0,
  };

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

  updated = [...updated, next];
  await writeQueue(updated);

  // Kick the worker without awaiting — never block the local write path.
  void import('./sync').then(mod => {
    void mod.drainSyncQueue();
    void mod.refreshSyncStatus();
  });

  return next;
}

export async function removeSyncItems(ids: string[]): Promise<void> {
  if (!ids.length) {
    return;
  }
  const idSet = new Set(ids);
  const queue = await readQueue();
  await writeQueue(queue.filter(item => !idSet.has(item.id)));
}

export async function updateSyncItem(
  id: string,
  patch: Partial<
    Pick<SyncQueueItem, 'retryCount' | 'nextRetryAt' | 'lastError'>
  >,
): Promise<void> {
  const queue = await readQueue();
  const updated = queue.map(item =>
    item.id === id ? { ...item, ...patch } : item,
  );
  await writeQueue(updated);
}

export async function clearSyncQueue(): Promise<void> {
  await AsyncStorage.removeItem(LOCAL_KEYS.syncQueue);
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
