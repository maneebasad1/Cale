import AsyncStorage from '@react-native-async-storage/async-storage';
import type { CalorieEntry, DailyLog, UserProfile } from '../types';
import type { FoodItem } from '../types/food';
import type { TargetSnapshot } from '../types/targetHistory';
import type { WeightEntry } from '../types/weight';
import type { WorkoutEntry } from '../types/workout';
import { LOCAL_KEYS } from './localKeys';

async function readJson<T>(key: string, fallback: T): Promise<T> {
  const raw = await AsyncStorage.getItem(key);
  if (!raw) {
    return fallback;
  }
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

async function writeJson(key: string, value: unknown): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

export async function localGetProfile(): Promise<UserProfile | null> {
  return readJson<UserProfile | null>(LOCAL_KEYS.profile, null);
}

export async function localSaveProfile(profile: UserProfile): Promise<void> {
  await writeJson(LOCAL_KEYS.profile, profile);
}

export async function localClearProfile(): Promise<void> {
  await AsyncStorage.removeItem(LOCAL_KEYS.profile);
}

export async function localGetAllLogs(): Promise<Record<string, DailyLog>> {
  return readJson<Record<string, DailyLog>>(LOCAL_KEYS.logs, {});
}

export async function localSaveAllLogs(
  logs: Record<string, DailyLog>,
): Promise<void> {
  await writeJson(LOCAL_KEYS.logs, logs);
}

export async function localGetDailyLog(date: string): Promise<DailyLog> {
  const logs = await localGetAllLogs();
  return logs[date] ?? { date, entries: [] };
}

export async function localSaveDailyLog(log: DailyLog): Promise<void> {
  const logs = await localGetAllLogs();
  if (log.entries.length === 0) {
    delete logs[log.date];
  } else {
    logs[log.date] = log;
  }
  await localSaveAllLogs(logs);
}

export async function localUpsertEntry(
  date: string,
  entry: CalorieEntry,
): Promise<void> {
  const log = await localGetDailyLog(date);
  const index = log.entries.findIndex(e => e.id === entry.id);
  if (index >= 0) {
    log.entries[index] = entry;
  } else {
    log.entries.push(entry);
  }
  await localSaveDailyLog(log);
}

export async function localDeleteEntry(
  date: string,
  entryId: string,
): Promise<void> {
  const log = await localGetDailyLog(date);
  log.entries = log.entries.filter(e => e.id !== entryId);
  await localSaveDailyLog(log);
}

export async function localGetCustomFoods(): Promise<FoodItem[]> {
  return readJson<FoodItem[]>(LOCAL_KEYS.customFoods, []);
}

export async function localSaveCustomFoods(foods: FoodItem[]): Promise<void> {
  await writeJson(LOCAL_KEYS.customFoods, foods);
}

export async function localGetTargetHistory(): Promise<TargetSnapshot[]> {
  return readJson<TargetSnapshot[]>(LOCAL_KEYS.targetHistory, []);
}

export async function localSaveTargetHistory(
  snapshots: TargetSnapshot[],
): Promise<void> {
  await writeJson(LOCAL_KEYS.targetHistory, snapshots);
}

export async function localGetAllWorkouts(): Promise<
  Record<string, WorkoutEntry[]>
> {
  return readJson<Record<string, WorkoutEntry[]>>(LOCAL_KEYS.workouts, {});
}

export async function localSaveAllWorkouts(
  workouts: Record<string, WorkoutEntry[]>,
): Promise<void> {
  await writeJson(LOCAL_KEYS.workouts, workouts);
}

export async function localGetWorkoutsForDate(
  date: string,
): Promise<WorkoutEntry[]> {
  const all = await localGetAllWorkouts();
  return all[date] ?? [];
}

export async function localSaveWorkoutsForDate(
  date: string,
  entries: WorkoutEntry[],
): Promise<void> {
  const all = await localGetAllWorkouts();
  if (entries.length === 0) {
    delete all[date];
  } else {
    all[date] = entries;
  }
  await localSaveAllWorkouts(all);
}

export async function localGetWeightEntries(): Promise<WeightEntry[]> {
  return readJson<WeightEntry[]>(LOCAL_KEYS.weightEntries, []);
}

export async function localSaveWeightEntries(
  entries: WeightEntry[],
): Promise<void> {
  await writeJson(LOCAL_KEYS.weightEntries, entries);
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

/** Wipe all local-first entity data + sync queue (call on sign-out / account switch). */
export async function resetLocalEntityStore(): Promise<void> {
  const { clearSyncQueue } = await import('./syncQueue');
  await Promise.all([
    localClearProfile(),
    localSaveAllLogs({}),
    localSaveCustomFoods([]),
    localSaveWeightEntries([]),
    localSaveTargetHistory([]),
    localSaveAllWorkouts({}),
    clearSyncQueue(),
    localClearHydratedUserId(),
    AsyncStorage.removeItem(LOCAL_KEYS.targetHistoryBackfillV1),
  ]);
  void import('./widgetSnapshot')
    .then(mod => mod.refreshHomeWidget())
    .catch(() => undefined);
}
