import type { CalorieEntry, DailyLog } from '../types';
import type { FoodItem } from '../types/food';
import type { WeightEntry } from '../types/weight';
import type { WorkoutEntry } from '../types/workout';
import type { LocalEntitySnapshot } from './localStore';
import type { SyncEntity, SyncQueueItem } from './syncQueue';

export interface HydrateMergeOptions {
  /**
   * Remote profile + target history replace local ones outright (guest data
   * claimed into an account that already has a profile).
   */
  remoteWins?: boolean;
}

function pendingDeleteIds(
  queue: SyncQueueItem[],
  entity: SyncEntity,
): Set<string> {
  const ids = new Set<string>();
  queue.forEach(item => {
    if (item.entity === entity && item.operation === 'delete') {
      const id = item.payload.id;
      if (typeof id === 'string') {
        ids.add(id);
      }
    }
  });
  return ids;
}

function hasPending(queue: SyncQueueItem[], entity: SyncEntity): boolean {
  return queue.some(item => item.entity === entity);
}

/** Local items win by id; remote items with a pending local delete stay gone. */
function unionById<T extends { id: string }>(
  local: T[],
  remote: T[],
  deleted: Set<string>,
): T[] {
  const localIds = new Set(local.map(item => item.id));
  return [
    ...local,
    ...remote.filter(item => !localIds.has(item.id) && !deleted.has(item.id)),
  ];
}

function mergeDated<T extends { id: string; timestamp: string }>(
  local: Record<string, T[]>,
  remote: Record<string, T[]>,
  deleted: Set<string>,
): Record<string, T[]> {
  const byId = new Map<string, { date: string; item: T }>();
  Object.entries(remote).forEach(([date, items]) => {
    items.forEach(item => {
      if (!deleted.has(item.id)) {
        byId.set(item.id, { date, item });
      }
    });
  });
  // Local wins (pending upserts / edits made while the fetch was in flight).
  Object.entries(local).forEach(([date, items]) => {
    items.forEach(item => {
      byId.set(item.id, { date, item });
    });
  });

  const result: Record<string, T[]> = {};
  byId.forEach(({ date, item }) => {
    (result[date] ??= []).push(item);
  });
  Object.values(result).forEach(items =>
    items.sort((a, b) => a.timestamp.localeCompare(b.timestamp)),
  );
  return result;
}

function logsToDated(
  logs: Record<string, DailyLog>,
): Record<string, CalorieEntry[]> {
  const result: Record<string, CalorieEntry[]> = {};
  Object.entries(logs).forEach(([date, log]) => {
    result[date] = log.entries;
  });
  return result;
}

function mergeWeights(
  local: WeightEntry[],
  remote: WeightEntry[],
  deleted: Set<string>,
): WeightEntry[] {
  // weight_entries is unique per (user, date): a local check-in replaces the
  // remote one for the same day.
  const localDates = new Set(local.map(entry => entry.date));
  return unionById(
    local,
    remote.filter(entry => !localDates.has(entry.date)),
    deleted,
  ).sort((a, b) => b.date.localeCompare(a.date));
}

/**
 * Combine remote data with whatever is on the device right now.
 *
 * Local data at this point is either guest/offline data being claimed, or
 * writes made while the remote fetch was in flight — so nothing local is
 * dropped. Items with a pending delete in the queue are not resurrected.
 */
export function mergeRemoteIntoLocal(
  local: LocalEntitySnapshot,
  remote: LocalEntitySnapshot,
  queue: SyncQueueItem[],
  options: HydrateMergeOptions = {},
): LocalEntitySnapshot {
  const remoteWins = options.remoteWins ?? false;

  const profile =
    !remoteWins && local.profile && hasPending(queue, 'profile')
      ? local.profile
      : (remote.profile ?? local.profile);

  let targetHistory = remote.targetHistory;
  if (!remoteWins) {
    if (local.targetHistory.length && hasPending(queue, 'targetHistory')) {
      targetHistory = local.targetHistory;
    } else if (!remote.targetHistory.length) {
      targetHistory = local.targetHistory;
    }
  }

  const mergedEntries = mergeDated(
    logsToDated(local.logs),
    logsToDated(remote.logs),
    pendingDeleteIds(queue, 'calorieEntry'),
  );
  const logs: Record<string, DailyLog> = {};
  Object.entries(mergedEntries).forEach(([date, entries]) => {
    logs[date] = { date, entries };
  });

  const workouts = mergeDated<WorkoutEntry>(
    local.workouts,
    remote.workouts,
    pendingDeleteIds(queue, 'workoutEntry'),
  );

  const customFoods = unionById<FoodItem>(
    local.customFoods,
    remote.customFoods,
    pendingDeleteIds(queue, 'customFood'),
  );

  const weightEntries = mergeWeights(
    local.weightEntries,
    remote.weightEntries,
    pendingDeleteIds(queue, 'weightEntry'),
  );

  return { profile, logs, customFoods, weightEntries, targetHistory, workouts };
}
