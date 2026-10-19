import type { WorkoutEntry } from '../types/workout';
import { createId } from '../utils/id';
import {
  localGetAllWorkouts,
  localGetWorkoutsForDate,
  localUpdateWorkoutsForDate,
} from './localStore';
import { enqueueSync } from './syncQueue';

function scheduleWidgetRefresh() {
  void import('./widgetSnapshot')
    .then(mod => mod.refreshHomeWidget())
    .catch(() => undefined);
}

export async function getAllWorkouts(): Promise<Record<string, WorkoutEntry[]>> {
  return localGetAllWorkouts();
}

export async function getWorkoutsForDate(date: string): Promise<WorkoutEntry[]> {
  return localGetWorkoutsForDate(date);
}

export async function addWorkoutEntry(
  date: string,
  entry: Omit<WorkoutEntry, 'id' | 'date' | 'timestamp'>,
): Promise<WorkoutEntry> {
  const full: WorkoutEntry = {
    ...entry,
    id: createId(),
    date,
    timestamp: new Date().toISOString(),
  };
  await localUpdateWorkoutsForDate(date, existing => [...existing, full]);
  await enqueueSync({
    entity: 'workoutEntry',
    operation: 'create',
    payload: { date, entry: full },
    coalesceKey: full.id,
  });
  scheduleWidgetRefresh();
  return full;
}

export async function updateWorkoutEntry(
  date: string,
  entryId: string,
  updates: Partial<
    Pick<
      WorkoutEntry,
      'name' | 'caloriesBurned' | 'durationMinutes' | 'entryMode' | 'workoutId'
    >
  >,
): Promise<void> {
  let next = null as WorkoutEntry | null;
  await localUpdateWorkoutsForDate(date, existing => {
    const entry = existing.find(item => item.id === entryId);
    if (!entry) {
      return existing;
    }
    const updated = { ...entry, ...updates };
    next = updated;
    return existing.map(item => (item.id === entryId ? updated : item));
  });
  if (!next) {
    return;
  }
  await enqueueSync({
    entity: 'workoutEntry',
    operation: 'update',
    payload: { date, entry: next },
    coalesceKey: entryId,
  });
  scheduleWidgetRefresh();
}

export async function deleteWorkoutEntry(
  date: string,
  entryId: string,
): Promise<void> {
  await localUpdateWorkoutsForDate(date, existing =>
    existing.filter(item => item.id !== entryId),
  );
  await enqueueSync({
    entity: 'workoutEntry',
    operation: 'delete',
    payload: { id: entryId, date },
    coalesceKey: entryId,
  });
  scheduleWidgetRefresh();
}

export async function replaceWorkoutsFromRemote(
  workouts: Record<string, WorkoutEntry[]>,
): Promise<void> {
  const { localSaveAllWorkouts } = await import('./localStore');
  await localSaveAllWorkouts(workouts);
}
