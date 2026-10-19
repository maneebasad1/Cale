import type { WeightEntry } from '../types/weight';
import { formatDateKey } from '../utils/date';
import { createId } from '../utils/id';
import {
  localGetWeightEntries,
  localUpdateWeightEntries,
} from './localStore';
import { enqueueSync } from './syncQueue';

export async function getWeightEntries(): Promise<WeightEntry[]> {
  const entries = await localGetWeightEntries();
  return [...entries].sort((a, b) => b.date.localeCompare(a.date));
}

export async function addWeightEntry(
  weightKg: number,
  date: string = formatDateKey(),
): Promise<WeightEntry> {
  let existing: WeightEntry | undefined;
  let entry!: WeightEntry;
  await localUpdateWeightEntries(entries => {
    existing = entries.find(e => e.date === date);
    entry = existing
      ? { ...existing, weightKg }
      : { id: createId(), date, weightKg };
    return existing
      ? entries.map(e => (e.date === date ? entry : e))
      : [entry, ...entries];
  });

  await enqueueSync({
    entity: 'weightEntry',
    operation: existing ? 'update' : 'create',
    payload: { entry },
    coalesceKey: entry.id,
  });
  return entry;
}

export async function deleteWeightEntry(id: string): Promise<void> {
  await localUpdateWeightEntries(entries => entries.filter(e => e.id !== id));
  await enqueueSync({
    entity: 'weightEntry',
    operation: 'delete',
    payload: { id },
    coalesceKey: id,
  });
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
