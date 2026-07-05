import AsyncStorage from '@react-native-async-storage/async-storage';
import type { CalorieEntry, DailyLog, UserProfile } from '../types';
import { formatDateKey } from '../utils/date';

const PROFILE_KEY = '@caltrack/profile';
const LOGS_KEY = '@caltrack/logs';

export async function getProfile(): Promise<UserProfile | null> {
  const raw = await AsyncStorage.getItem(PROFILE_KEY);
  if (!raw) {
    return null;
  }
  const profile = JSON.parse(raw) as Partial<UserProfile> & {
    maintenanceCalories: number;
    weightKg: number;
  };

  if (profile.dailyTargetCalories == null) {
    return {
      ...profile,
      goalType: profile.goalType ?? 'lose',
      goalWeightKg: profile.goalWeightKg ?? profile.weightKg,
      calorieAdjustment: profile.calorieAdjustment ?? 0,
      dailyTargetCalories: profile.maintenanceCalories,
    } as UserProfile;
  }

  return profile as UserProfile;
}

export async function saveProfile(profile: UserProfile): Promise<void> {
  await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
}

export async function getAllLogs(): Promise<Record<string, DailyLog>> {
  const raw = await AsyncStorage.getItem(LOGS_KEY);
  if (!raw) {
    return {};
  }
  return JSON.parse(raw) as Record<string, DailyLog>;
}

export async function getDailyLog(date: string): Promise<DailyLog> {
  const logs = await getAllLogs();
  return logs[date] ?? { date, entries: [] };
}

export async function saveDailyLog(log: DailyLog): Promise<void> {
  const logs = await getAllLogs();
  if (log.entries.length === 0) {
    delete logs[log.date];
  } else {
    logs[log.date] = log;
  }
  await AsyncStorage.setItem(LOGS_KEY, JSON.stringify(logs));
}

export async function addEntry(
  date: string,
  entry: Omit<CalorieEntry, 'id' | 'timestamp'>,
): Promise<CalorieEntry> {
  const log = await getDailyLog(date);
  const newEntry: CalorieEntry = {
    ...entry,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    timestamp: new Date().toISOString(),
  };
  log.entries.push(newEntry);
  await saveDailyLog(log);
  return newEntry;
}

export async function updateEntry(
  date: string,
  entryId: string,
  updates: Partial<
    Pick<
      CalorieEntry,
      | 'mealType'
      | 'calories'
      | 'entryMode'
      | 'foodName'
      | 'foodId'
      | 'servingLabel'
    >
  >,
): Promise<void> {
  const log = await getDailyLog(date);
  const index = log.entries.findIndex(e => e.id === entryId);
  if (index === -1) {
    return;
  }
  log.entries[index] = { ...log.entries[index], ...updates };
  await saveDailyLog(log);
}

export async function deleteEntry(
  date: string,
  entryId: string,
): Promise<void> {
  const log = await getDailyLog(date);
  log.entries = log.entries.filter(e => e.id !== entryId);
  await saveDailyLog(log);
}

export async function getTodayLog(): Promise<DailyLog> {
  return getDailyLog(formatDateKey());
}

export function getTotalCalories(log: DailyLog): number {
  return log.entries.reduce((sum, e) => sum + e.calories, 0);
}

export async function copyDayEntries(
  fromDate: string,
  toDate: string,
): Promise<number> {
  const source = await getDailyLog(fromDate);
  if (!source.entries.length) {
    return 0;
  }

  const target = await getDailyLog(toDate);
  const copied = source.entries.map(entry => ({
    ...entry,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    timestamp: new Date().toISOString(),
  }));

  target.entries.push(...copied);
  await saveDailyLog(target);
  return copied.length;
}

export async function getLastEntryForMeal(
  mealType: CalorieEntry['mealType'],
  beforeDate: string,
): Promise<{ entry: CalorieEntry; date: string } | null> {
  const logs = await getAllLogs();
  const dates = Object.keys(logs)
    .filter(date => date < beforeDate)
    .sort((a, b) => b.localeCompare(a));

  for (const date of dates) {
    const entries = logs[date].entries.filter(
      entry => entry.mealType === mealType,
    );
    if (entries.length) {
      return { entry: entries[entries.length - 1], date };
    }
  }

  return null;
}
