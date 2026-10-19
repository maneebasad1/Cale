import AsyncStorage from '@react-native-async-storage/async-storage';
import type { CalorieEntry, DailyLog, UserProfile } from '../types';
import type { FoodItem } from '../types/food';
import type { TargetSnapshot } from '../types/targetHistory';
import type { WeightEntry } from '../types/weight';
import type { WorkoutEntry } from '../types/workout';
import { createAsyncMutex } from '../utils/asyncMutex';
import { LOCAL_KEYS } from './localKeys';
import { clearSyncQueue } from './syncQueue';

/**
 * Parsed blobs keyed by AsyncStorage key. Values returned from reads are the
 * cached objects themselves — treat them as immutable. Every write in this
 * module builds new objects (copy-on-write) and updates the cache only after
 * the disk write succeeds.
 */
const cache = new Map<string, unknown>();

/** Serializes every read-modify-write of local entity blobs. Not re-entrant. */
const storeLock = createAsyncMutex();

/** Bumped by resetLocalEntityStore so in-flight hydrations can detect a reset. */
let storeGeneration = 0;

export function getLocalStoreGeneration(): number {
  return storeGeneration;
}

async function readJson<T>(key: string, fallback: T): Promise<T> {
  if (cache.has(key)) {
    return cache.get(key) as T;
  }
  const generation = storeGeneration;
  const raw = await AsyncStorage.getItem(key);
  if (cache.has(key)) {
    // A write landed while we were reading; it is newer than `raw`.
    return cache.get(key) as T;
  }
  // Don't repopulate the cache with pre-reset data.
  const canCache = generation === storeGeneration;
  if (!raw) {
    if (canCache) {
      cache.set(key, fallback);
    }
    return fallback;
  }
  try {
    const parsed = JSON.parse(raw) as T;
    if (canCache) {
      cache.set(key, parsed);
    }
    return parsed;
  } catch (error) {
    // Keep the unreadable blob so the next write doesn't destroy it for good.
    console.warn(`[localStore] Corrupt JSON in ${key}; backed up to ${key}:corrupt`, error);
    try {
      await AsyncStorage.setItem(`${key}:corrupt`, raw);
    } catch {
      // Best effort.
    }
    return fallback;
  }
}

async function writeJson(key: string, value: unknown): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(value));
  cache.set(key, value);
}

async function removeKey(key: string): Promise<void> {
  await AsyncStorage.removeItem(key);
  cache.delete(key);
}

/** Atomic read-modify-write. Return the same reference to skip the write. */
async function updateJson<T>(
  key: string,
  fallback: T,
  updater: (current: T) => T,
): Promise<T> {
  return storeLock.run(async () => {
    const current = await readJson<T>(key, fallback);
    const next = updater(current);
    if (next !== current) {
      await writeJson(key, next);
    }
    return next;
  });
}

export async function localGetProfile(): Promise<UserProfile | null> {
  return readJson<UserProfile | null>(LOCAL_KEYS.profile, null);
}

export async function localSaveProfile(profile: UserProfile): Promise<void> {
  await storeLock.run(() => writeJson(LOCAL_KEYS.profile, profile));
}

export async function localClearProfile(): Promise<void> {
  await storeLock.run(() => removeKey(LOCAL_KEYS.profile));
}

export async function localGetAllLogs(): Promise<Record<string, DailyLog>> {
  return readJson<Record<string, DailyLog>>(LOCAL_KEYS.logs, {});
}

export async function localSaveAllLogs(
  logs: Record<string, DailyLog>,
): Promise<void> {
  await storeLock.run(() => writeJson(LOCAL_KEYS.logs, logs));
}

/** Atomically transform all logs. Return the same object to skip the write. */
export async function localUpdateAllLogs(
  updater: (logs: Record<string, DailyLog>) => Record<string, DailyLog>,
): Promise<Record<string, DailyLog>> {
  return updateJson(LOCAL_KEYS.logs, {}, updater);
}

export async function localGetDailyLog(date: string): Promise<DailyLog> {
  const logs = await localGetAllLogs();
  return logs[date] ?? { date, entries: [] };
}

function withDailyLog(
  logs: Record<string, DailyLog>,
  log: DailyLog,
): Record<string, DailyLog> {
  const next = { ...logs };
  if (log.entries.length === 0) {
    delete next[log.date];
  } else {
    next[log.date] = log;
  }
  return next;
}

export async function localSaveDailyLog(log: DailyLog): Promise<void> {
  await localUpdateAllLogs(logs => withDailyLog(logs, log));
}

export async function localUpsertEntry(
  date: string,
  entry: CalorieEntry,
): Promise<void> {
  await localUpdateAllLogs(logs => {
    const entries = logs[date]?.entries ?? [];
    const index = entries.findIndex(e => e.id === entry.id);
    const nextEntries =
      index >= 0
        ? entries.map(e => (e.id === entry.id ? entry : e))
        : [...entries, entry];
    return withDailyLog(logs, { date, entries: nextEntries });
  });
}

export async function localDeleteEntry(
  date: string,
  entryId: string,
): Promise<void> {
  await localUpdateAllLogs(logs => {
    const log = logs[date];
    if (!log || !log.entries.some(e => e.id === entryId)) {
      return logs;
    }
    return withDailyLog(logs, {
      date,
      entries: log.entries.filter(e => e.id !== entryId),
    });
  });
}

export async function localGetCustomFoods(): Promise<FoodItem[]> {
  return readJson<FoodItem[]>(LOCAL_KEYS.customFoods, []);
}

export async function localSaveCustomFoods(foods: FoodItem[]): Promise<void> {
  await storeLock.run(() => writeJson(LOCAL_KEYS.customFoods, foods));
}

/** Atomically transform custom foods. Return the same array to skip the write. */
export async function localUpdateCustomFoods(
  updater: (foods: FoodItem[]) => FoodItem[],
): Promise<FoodItem[]> {
  return updateJson(LOCAL_KEYS.customFoods, [], updater);
}

export async function localGetTargetHistory(): Promise<TargetSnapshot[]> {
  return readJson<TargetSnapshot[]>(LOCAL_KEYS.targetHistory, []);
}

export async function localSaveTargetHistory(
  snapshots: TargetSnapshot[],
): Promise<void> {
  await storeLock.run(() => writeJson(LOCAL_KEYS.targetHistory, snapshots));
}

/** Atomically transform target history. Return the same array to skip the write. */
export async function localUpdateTargetHistory(
  updater: (snapshots: TargetSnapshot[]) => TargetSnapshot[],
): Promise<TargetSnapshot[]> {
  return updateJson(LOCAL_KEYS.targetHistory, [], updater);
}

export async function localGetAllWorkouts(): Promise<
  Record<string, WorkoutEntry[]>
> {
  return readJson<Record<string, WorkoutEntry[]>>(LOCAL_KEYS.workouts, {});
}

export async function localSaveAllWorkouts(
  workouts: Record<string, WorkoutEntry[]>,
): Promise<void> {
  await storeLock.run(() => writeJson(LOCAL_KEYS.workouts, workouts));
}

/** Atomically transform all workouts. Return the same object to skip the write. */
export async function localUpdateAllWorkouts(
  updater: (
    workouts: Record<string, WorkoutEntry[]>,
  ) => Record<string, WorkoutEntry[]>,
): Promise<Record<string, WorkoutEntry[]>> {
  return updateJson(LOCAL_KEYS.workouts, {}, updater);
}

export async function localGetWorkoutsForDate(
  date: string,
): Promise<WorkoutEntry[]> {
  const all = await localGetAllWorkouts();
  return all[date] ?? [];
}

function withWorkoutsForDate(
  all: Record<string, WorkoutEntry[]>,
  date: string,
  entries: WorkoutEntry[],
): Record<string, WorkoutEntry[]> {
  const next = { ...all };
  if (entries.length === 0) {
    delete next[date];
  } else {
    next[date] = entries;
  }
  return next;
}

export async function localSaveWorkoutsForDate(
  date: string,
  entries: WorkoutEntry[],
): Promise<void> {
  await localUpdateAllWorkouts(all => withWorkoutsForDate(all, date, entries));
}

/**
 * Atomically transform one day's workouts. Prefer this over
 * localGetWorkoutsForDate + localSaveWorkoutsForDate, which can lose writes
 * when two edits overlap.
 */
export async function localUpdateWorkoutsForDate(
  date: string,
  updater: (entries: WorkoutEntry[]) => WorkoutEntry[],
): Promise<WorkoutEntry[]> {
  let result: WorkoutEntry[] = [];
  await localUpdateAllWorkouts(all => {
    const current = all[date] ?? [];
    result = updater(current);
    return result === current ? all : withWorkoutsForDate(all, date, result);
  });
  return result;
}

export async function localGetWeightEntries(): Promise<WeightEntry[]> {
  return readJson<WeightEntry[]>(LOCAL_KEYS.weightEntries, []);
}

export async function localSaveWeightEntries(
  entries: WeightEntry[],
): Promise<void> {
  await storeLock.run(() => writeJson(LOCAL_KEYS.weightEntries, entries));
}

/**
 * Atomically transform weight entries. Prefer this over
 * localGetWeightEntries + localSaveWeightEntries, which can lose writes.
 */
export async function localUpdateWeightEntries(
  updater: (entries: WeightEntry[]) => WeightEntry[],
): Promise<WeightEntry[]> {
  return updateJson(LOCAL_KEYS.weightEntries, [], updater);
}

export async function localGetHydratedUserId(): Promise<string | null> {
  return AsyncStorage.getItem(LOCAL_KEYS.hydratedUserId);
}

export async function localSetHydratedUserId(userId: string): Promise<void> {
  await AsyncStorage.setItem(LOCAL_KEYS.hydratedUserId, userId);
}

export async function localClearHydratedUserId(): Promise<void> {
  await AsyncStorage.removeItem(LOCAL_KEYS.hydratedUserId);
}

/** True when local entity store has no meaningful user data yet. */
export async function localIsEmpty(): Promise<boolean> {
  const [profile, logs, foods, weights, targets, workouts] = await Promise.all([
    localGetProfile(),
    localGetAllLogs(),
    localGetCustomFoods(),
    localGetWeightEntries(),
    localGetTargetHistory(),
    localGetAllWorkouts(),
  ]);
  const hasLogs = Object.keys(logs).length > 0;
  const hasWorkouts = Object.keys(workouts).length > 0;
  return (
    !profile &&
    !hasLogs &&
    foods.length === 0 &&
    weights.length === 0 &&
    targets.length === 0 &&
    !hasWorkouts
  );
}

export interface LocalEntitySnapshot {
  profile: UserProfile | null;
  logs: Record<string, DailyLog>;
  customFoods: FoodItem[];
  weightEntries: WeightEntry[];
  targetHistory: TargetSnapshot[];
  workouts: Record<string, WorkoutEntry[]>;
}

/**
 * Apply remote data under the store lock: `merge` sees the current local
 * snapshot (including writes made while the remote fetch was in flight) and
 * returns the values to persist. Aborts (returns false) when the store was
 * reset after `expectedGeneration` was read — e.g. sign-out mid-hydration.
 * On success also records `hydratedUserId`.
 */
export async function localApplyRemoteSnapshot(
  expectedGeneration: number,
  hydratedUserId: string,
  merge: (current: LocalEntitySnapshot) => Promise<LocalEntitySnapshot>,
): Promise<boolean> {
  return storeLock.run(async () => {
    if (expectedGeneration !== storeGeneration) {
      return false;
    }
    const [profile, logs, customFoods, weightEntries, targetHistory, workouts] =
      await Promise.all([
        localGetProfile(),
        localGetAllLogs(),
        localGetCustomFoods(),
        localGetWeightEntries(),
        localGetTargetHistory(),
        localGetAllWorkouts(),
      ]);
    const next = await merge({
      profile,
      logs,
      customFoods,
      weightEntries,
      targetHistory,
      workouts,
    });
    if (expectedGeneration !== storeGeneration) {
      return false;
    }
    if (next.profile) {
      await writeJson(LOCAL_KEYS.profile, next.profile);
    }
    await Promise.all([
      writeJson(LOCAL_KEYS.logs, next.logs),
      writeJson(LOCAL_KEYS.customFoods, next.customFoods),
      writeJson(LOCAL_KEYS.weightEntries, next.weightEntries),
      writeJson(LOCAL_KEYS.targetHistory, next.targetHistory),
      writeJson(LOCAL_KEYS.workouts, next.workouts),
    ]);
    await localSetHydratedUserId(hydratedUserId);
    return true;
  });
}

/** Wipe all local-first entity data + sync queue (call on sign-out / account switch). */
export async function resetLocalEntityStore(): Promise<void> {
  // Invalidate in-flight hydrations immediately, before waiting for the lock.
  storeGeneration += 1;
  await storeLock.run(async () => {
    storeGeneration += 1;
    cache.clear();
    await Promise.all([
      AsyncStorage.removeItem(LOCAL_KEYS.profile),
      writeJson(LOCAL_KEYS.logs, {}),
      writeJson(LOCAL_KEYS.customFoods, []),
      writeJson(LOCAL_KEYS.weightEntries, []),
      writeJson(LOCAL_KEYS.targetHistory, []),
      writeJson(LOCAL_KEYS.workouts, {}),
      clearSyncQueue(),
      localClearHydratedUserId(),
      AsyncStorage.removeItem(LOCAL_KEYS.targetHistoryBackfillV1),
    ]);
  });
  void import('./widgetSnapshot')
    .then(mod => mod.refreshHomeWidget())
    .catch(() => undefined);
}
