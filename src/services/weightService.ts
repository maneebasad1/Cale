import AsyncStorage from '@react-native-async-storage/async-storage';
import type { WeightEntry } from '../types/weight';
import { formatDateKey } from '../utils/date';

const WEIGHT_LOG_KEY = '@caltrack/weight-log';

function createId(): string {
  return `weight-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export async function getWeightEntries(): Promise<WeightEntry[]> {
  const raw = await AsyncStorage.getItem(WEIGHT_LOG_KEY);
  if (!raw) {
    return [];
  }
  return (JSON.parse(raw) as WeightEntry[]).sort((a, b) =>
    b.date.localeCompare(a.date),
  );
}

async function saveWeightEntries(entries: WeightEntry[]): Promise<void> {
  await AsyncStorage.setItem(WEIGHT_LOG_KEY, JSON.stringify(entries));
}

export async function addWeightEntry(
  weightKg: number,
  date: string = formatDateKey(),
): Promise<WeightEntry> {
  const entries = await getWeightEntries();
  const existingIndex = entries.findIndex(entry => entry.date === date);
  const entry: WeightEntry = {
    id: existingIndex >= 0 ? entries[existingIndex].id : createId(),
    date,
    weightKg,
  };

  if (existingIndex >= 0) {
    entries[existingIndex] = entry;
  } else {
    entries.unshift(entry);
  }

  await saveWeightEntries(entries);
  return entry;
}

export async function deleteWeightEntry(id: string): Promise<void> {
  const entries = await getWeightEntries();
  await saveWeightEntries(entries.filter(entry => entry.id !== id));
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
