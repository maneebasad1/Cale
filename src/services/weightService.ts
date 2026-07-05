import type { WeightEntry } from '../types/weight';
import { formatDateKey } from '../utils/date';
import {
  deleteWeightEntryRow,
  fetchWeightEntries,
  upsertWeightEntry,
} from './supabaseData';

export async function getWeightEntries(): Promise<WeightEntry[]> {
  return fetchWeightEntries();
}

export async function addWeightEntry(
  weightKg: number,
  date: string = formatDateKey(),
): Promise<WeightEntry> {
  return upsertWeightEntry(weightKg, date);
}

export async function deleteWeightEntry(id: string): Promise<void> {
  await deleteWeightEntryRow(id);
}

export async function getLatestWeightEntry(): Promise<WeightEntry | null> {
  const entries = await getWeightEntries();
  return entries[0] ?? null;
}

export function shouldPromptWeightCheckIn(
  latestEntry: WeightEntry | null,
  today: string = formatDateKey(),
): boolean {
  if (!latestEntry) {
    return true;
  }

  const latest = new Date(latestEntry.date);
  const now = new Date(today);
  const diffDays = Math.floor(
    (now.getTime() - latest.getTime()) / (1000 * 60 * 60 * 24),
  );
  return diffDays >= 7;
}
