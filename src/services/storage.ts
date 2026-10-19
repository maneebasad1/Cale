import type { CalorieEntry, DailyLog, UserProfile } from '../types';
import { formatDateKey } from '../utils/date';
import { createId } from '../utils/id';
import {
  localDeleteEntry,
  localGetAllLogs,
  localGetDailyLog,
  localGetProfile,
  localSaveProfile,
  localUpdateAllLogs,
  localUpsertEntry,
} from './localStore';
import { enqueueSync } from './syncQueue';

import { recordTargetSnapshotIfChanged } from './targetHistoryService';

function scheduleWidgetRefresh() {
  void import('./widgetSnapshot')
    .then(mod => mod.refreshHomeWidget())
    .catch(() => undefined);
}

export async function getProfile(): Promise<UserProfile | null> {
  return localGetProfile();
}

export async function saveProfile(profile: UserProfile): Promise<void> {
  await localSaveProfile(profile);
  await recordTargetSnapshotIfChanged(profile);
  await enqueueSync({
    entity: 'profile',
    operation: 'update',
    payload: { profile },
    coalesceKey: 'profile',
  });
  scheduleWidgetRefresh();
}

export async function getAllLogs(): Promise<Record<string, DailyLog>> {
  return localGetAllLogs();
}

export async function getDailyLog(date: string): Promise<DailyLog> {
  return localGetDailyLog(date);
}

export async function saveDailyLog(log: DailyLog): Promise<void> {
  // Read the old day and write the new one atomically so overlapping saves
  // can't lose each other's changes.
  let existingEntries: CalorieEntry[] = [];
  await localUpdateAllLogs(logs => {
    existingEntries = logs[log.date]?.entries ?? [];
    const next = { ...logs };
    if (log.entries.length === 0) {
      delete next[log.date];
    } else {
      next[log.date] = log;
    }
    return next;
  });

  const nextIds = new Set(log.entries.map(e => e.id));
  for (const entry of existingEntries) {
    if (!nextIds.has(entry.id)) {
      await enqueueSync({
        entity: 'calorieEntry',
        operation: 'delete',
        payload: { id: entry.id, date: log.date },
        coalesceKey: entry.id,
      });
    }
  }

  for (const entry of log.entries) {
    const wasExisting = existingEntries.some(e => e.id === entry.id);
    await enqueueSync({
      entity: 'calorieEntry',
      operation: wasExisting ? 'update' : 'create',
      payload: { date: log.date, entry },
      coalesceKey: entry.id,
    });
  }
  scheduleWidgetRefresh();
}

export async function addEntry(
  date: string,
  entry: Omit<CalorieEntry, 'id' | 'timestamp'>,
): Promise<CalorieEntry> {
  const full: CalorieEntry = {
    ...entry,
    id: createId(),
    timestamp: new Date().toISOString(),
  };
  await localUpsertEntry(date, full);
  await enqueueSync({
    entity: 'calorieEntry',
    operation: 'create',
    payload: { date, entry: full },
    coalesceKey: full.id,
  });
  scheduleWidgetRefresh();
  return full;
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
  // Atomic: an overlapping delete must not be undone by this update.
  let next: CalorieEntry | null = null;
  await localUpdateAllLogs(logs => {
    const log = logs[date];
    const existing = log?.entries.find(e => e.id === entryId);
    if (!log || !existing) {
      return logs;
    }
    const updated: CalorieEntry = { ...existing, ...updates };
    next = updated;
    return {
      ...logs,
      [date]: {
        ...log,
        entries: log.entries.map(e => (e.id === entryId ? updated : e)),
      },
    };
  });
  if (!next) {
    return;
  }
  await enqueueSync({
    entity: 'calorieEntry',
    operation: 'update',
    payload: { date, entry: next },
    coalesceKey: entryId,
  });
  scheduleWidgetRefresh();
}

export async function deleteEntry(
  date: string,
  entryId: string,
): Promise<void> {
  await localDeleteEntry(date, entryId);
  await enqueueSync({
    entity: 'calorieEntry',
    operation: 'delete',
    payload: { id: entryId, date },
    coalesceKey: entryId,
  });
  scheduleWidgetRefresh();
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

  let count = 0;
  for (const entry of source.entries) {
    await addEntry(toDate, {
      mealType: entry.mealType,
      calories: entry.calories,
      entryMode: entry.entryMode,
      foodName: entry.foodName,
      foodId: entry.foodId,
      servingLabel: entry.servingLabel,
    });
    count += 1;
  }
  return count;
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
