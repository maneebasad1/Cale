import type { CalorieEntry, DailyLog, UserProfile } from '../types';
import { formatDateKey } from '../utils/date';
import * as db from './supabaseData';

export async function getProfile(): Promise<UserProfile | null> {
  return db.fetchProfile();
}

export async function saveProfile(profile: UserProfile): Promise<void> {
  await db.upsertProfile(profile);
}

export async function getAllLogs(): Promise<Record<string, DailyLog>> {
  return db.fetchAllLogs();
}

export async function getDailyLog(date: string): Promise<DailyLog> {
  return db.fetchDailyLog(date);
}

export async function saveDailyLog(log: DailyLog): Promise<void> {
  const existing = await db.fetchDailyLog(log.date);
  const existingIds = new Set(existing.entries.map(entry => entry.id));
  const nextIds = new Set(log.entries.map(entry => entry.id));

  for (const entry of existing.entries) {
    if (!nextIds.has(entry.id)) {
      await db.removeEntry(entry.id);
    }
  }

  for (const entry of log.entries) {
    if (existingIds.has(entry.id)) {
      await db.patchEntry(entry.id, {
        mealType: entry.mealType,
        calories: entry.calories,
        entryMode: entry.entryMode,
        foodName: entry.foodName,
        foodId: entry.foodId,
        servingLabel: entry.servingLabel,
      });
    } else {
      await db.insertEntry(log.date, {
        mealType: entry.mealType,
        calories: entry.calories,
        entryMode: entry.entryMode,
        foodName: entry.foodName,
        foodId: entry.foodId,
        servingLabel: entry.servingLabel,
      });
    }
  }
}

export async function addEntry(
  date: string,
  entry: Omit<CalorieEntry, 'id' | 'timestamp'>,
): Promise<CalorieEntry> {
  return db.insertEntry(date, entry);
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
  await db.patchEntry(entryId, updates);
}

export async function deleteEntry(
  date: string,
  entryId: string,
): Promise<void> {
  await db.removeEntry(entryId);
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

  return db.insertEntries(
    toDate,
    source.entries.map(entry => ({
      mealType: entry.mealType,
      calories: entry.calories,
      entryMode: entry.entryMode,
      foodName: entry.foodName,
      foodId: entry.foodId,
      servingLabel: entry.servingLabel,
    })),
  );
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
