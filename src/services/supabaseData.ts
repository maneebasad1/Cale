import { getSupabase } from '../lib/supabase';
import type { CalorieEntry, DailyLog, UserProfile } from '../types';
import type { FoodItem } from '../types/food';
import type { TargetSnapshot } from '../types/targetHistory';
import type { WeightEntry } from '../types/weight';
import type { WorkoutEntry } from '../types/workout';
import {
  CalorieEntryRow,
  CustomFoodRow,
  ProfileRow,
  TargetHistoryRow,
  WeightEntryRow,
  WorkoutEntryRow,
  customFoodFromRow,
  entryFromRow,
  profileFromRow,
  profileToRow,
  targetSnapshotFromRow,
  weightFromRow,
  workoutFromRow,
} from './supabaseMappers';

/** Local session read — no network round-trip. Prefer for identity checks. */
export async function tryGetSessionUserId(): Promise<string | null> {
  const {
    data: { session },
  } = await getSupabase().auth.getSession();
  return session?.user?.id ?? null;
}

async function getUserId(): Promise<string> {
  const sessionUserId = await tryGetSessionUserId();
  if (sessionUserId) {
    return sessionUserId;
  }

  const { data, error } = await getSupabase().auth.getUser();
  if (error || !data.user) {
    throw new Error('Not authenticated');
  }
  return data.user.id;
}

export async function tryGetUserId(): Promise<string | null> {
  try {
    return await getUserId();
  } catch {
    return null;
  }
}

/** PostgREST caps responses (default max-rows 1000), so page explicitly. */
const PAGE_SIZE = 1000;

async function fetchAllPages<T>(
  fetchPage: (
    from: number,
    to: number,
  ) => PromiseLike<{ data: unknown[] | null; error: unknown }>,
): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await fetchPage(from, from + PAGE_SIZE - 1);
    if (error) {
      throw error;
    }
    const page = (data ?? []) as T[];
    rows.push(...page);
    if (page.length < PAGE_SIZE) {
      return rows;
    }
  }
}

export async function fetchProfile(): Promise<UserProfile | null> {
  const userId = await getUserId();
  const { data, error } = await getSupabase()
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    throw error;
  }
  if (!data) {
    return null;
  }
  return profileFromRow(data as ProfileRow);
}

export async function upsertProfile(profile: UserProfile): Promise<void> {
  const userId = await getUserId();
  const row = profileToRow(userId, profile);
  const { error } = await getSupabase()
    .from('profiles')
    .upsert({ ...row, updated_at: new Date().toISOString() });

  if (error) {
    throw error;
  }
}

export async function fetchAllLogs(): Promise<Record<string, DailyLog>> {
  const userId = await getUserId();
  const data = await fetchAllPages<CalorieEntryRow>((from, to) =>
    getSupabase()
      .from('calorie_entries')
      .select('*')
      .eq('user_id', userId)
      .order('logged_at', { ascending: true })
      .order('id', { ascending: true })
      .range(from, to),
  );

  const logs: Record<string, DailyLog> = {};
  data.forEach(row => {
    if (!logs[row.log_date]) {
      logs[row.log_date] = { date: row.log_date, entries: [] };
    }
    logs[row.log_date].entries.push(entryFromRow(row));
  });
  return logs;
}

export async function fetchDailyLog(date: string): Promise<DailyLog> {
  const userId = await getUserId();
  const { data, error } = await getSupabase()
    .from('calorie_entries')
    .select('*')
    .eq('user_id', userId)
    .eq('log_date', date)
    .order('logged_at', { ascending: true });

  if (error) {
    throw error;
  }

  return {
    date,
    entries: (data as CalorieEntryRow[]).map(entryFromRow),
  };
}

/** Upsert by client-generated UUID so retries don't create duplicates. */
export async function upsertCalorieEntry(
  date: string,
  entry: CalorieEntry,
): Promise<void> {
  const userId = await getUserId();
  const { error } = await getSupabase().from('calorie_entries').upsert(
    {
      id: entry.id,
      user_id: userId,
      log_date: date,
      meal_type: entry.mealType,
      calories: entry.calories,
      entry_mode: entry.entryMode ?? null,
      food_name: entry.foodName ?? null,
      food_id: entry.foodId ?? null,
      serving_label: entry.servingLabel ?? null,
      logged_at: entry.timestamp,
    },
    { onConflict: 'id' },
  );

  if (error) {
    throw error;
  }
}

export async function removeEntry(entryId: string): Promise<void> {
  const userId = await getUserId();
  const { error } = await getSupabase()
    .from('calorie_entries')
    .delete()
    .eq('id', entryId)
    .eq('user_id', userId);

  if (error) {
    throw error;
  }
}

export async function fetchCustomFoods(): Promise<FoodItem[]> {
  const userId = await getUserId();
  const data = await fetchAllPages<CustomFoodRow>((from, to) =>
    getSupabase()
      .from('custom_foods')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .order('id', { ascending: true })
      .range(from, to),
  );
  return data.map(customFoodFromRow);
}

export async function upsertCustomFood(food: FoodItem): Promise<void> {
  const userId = await getUserId();
  const { error } = await getSupabase().from('custom_foods').upsert(
    {
      id: food.id,
      user_id: userId,
      name: food.name.trim(),
      calories: food.calories,
      serving_label: food.servingLabel?.trim() || '1 serving',
    },
    { onConflict: 'id' },
  );

  if (error) {
    throw error;
  }
}

export async function deleteCustomFoodRow(id: string): Promise<void> {
  const userId = await getUserId();
  const { error } = await getSupabase()
    .from('custom_foods')
    .delete()
    .eq('id', id)
    .eq('user_id', userId);

  if (error) {
    throw error;
  }
}

export async function fetchWeightEntries(): Promise<WeightEntry[]> {
  const userId = await getUserId();
  const data = await fetchAllPages<WeightEntryRow>((from, to) =>
    getSupabase()
      .from('weight_entries')
      .select('*')
      .eq('user_id', userId)
      .order('log_date', { ascending: false })
      .order('id', { ascending: true })
      .range(from, to),
  );
  return data.map(weightFromRow);
}

export async function upsertWeightEntryRemote(
  entry: WeightEntry,
): Promise<void> {
  const userId = await getUserId();
  // Prefer id conflict; also unique on (user_id, log_date).
  const { error } = await getSupabase().from('weight_entries').upsert(
    {
      id: entry.id,
      user_id: userId,
      log_date: entry.date,
      weight_kg: entry.weightKg,
    },
    { onConflict: 'id' },
  );

  if (error) {
    // Fallback for rows that already exist under a different id for that date.
    const { error: conflictError } = await getSupabase()
      .from('weight_entries')
      .upsert(
        {
          id: entry.id,
          user_id: userId,
          log_date: entry.date,
          weight_kg: entry.weightKg,
        },
        { onConflict: 'user_id,log_date' },
      );
    if (conflictError) {
      throw conflictError;
    }
  }
}

export async function deleteWeightEntryRow(id: string): Promise<void> {
  const userId = await getUserId();
  const { error } = await getSupabase()
    .from('weight_entries')
    .delete()
    .eq('id', id)
    .eq('user_id', userId);

  if (error) {
    throw error;
  }
}

export async function fetchTargetHistory(): Promise<TargetSnapshot[]> {
  const userId = await getUserId();
  const data = await fetchAllPages<TargetHistoryRow>((from, to) =>
    getSupabase()
      .from('target_history')
      .select('*')
      .eq('user_id', userId)
      .order('effective_from', { ascending: true })
      .range(from, to),
  );
  return data.map(targetSnapshotFromRow);
}

/**
 * Make remote target history equal `snapshots` without ever leaving it empty
 * mid-way: upsert the new set first, then delete rows that aren't in it.
 */
export async function replaceTargetHistoryRemote(
  snapshots: TargetSnapshot[],
): Promise<void> {
  const userId = await getUserId();
  // One row per effective_from (last wins) — the upsert can't touch a row twice.
  const byDate = new Map<string, TargetSnapshot>();
  snapshots.forEach(snapshot => byDate.set(snapshot.effectiveFrom, snapshot));
  const rows = [...byDate.values()].map(snapshot => ({
    user_id: userId,
    effective_from: snapshot.effectiveFrom,
    daily_target_calories: snapshot.dailyTargetCalories,
    maintenance_calories: snapshot.maintenanceCalories,
  }));

  if (rows.length) {
    const { error } = await getSupabase()
      .from('target_history')
      .upsert(rows, { onConflict: 'user_id,effective_from' });
    if (error) {
      throw error;
    }
  }

  let staleQuery = getSupabase()
    .from('target_history')
    .delete()
    .eq('user_id', userId);
  if (rows.length) {
    // effective_from is a YYYY-MM-DD date, safe inside a PostgREST in-list.
    staleQuery = staleQuery.not(
      'effective_from',
      'in',
      `(${[...byDate.keys()].join(',')})`,
    );
  }
  const { error: deleteError } = await staleQuery;
  if (deleteError) {
    throw deleteError;
  }
}

export async function fetchAllWorkouts(): Promise<Record<string, WorkoutEntry[]>> {
  const userId = await getUserId();
  const data = await fetchAllPages<WorkoutEntryRow>((from, to) =>
    getSupabase()
      .from('workout_entries')
      .select('*')
      .eq('user_id', userId)
      .order('logged_at', { ascending: true })
      .order('id', { ascending: true })
      .range(from, to),
  );

  const workouts: Record<string, WorkoutEntry[]> = {};
  data.forEach(row => {
    const entry = workoutFromRow(row);
    if (!workouts[entry.date]) {
      workouts[entry.date] = [];
    }
    workouts[entry.date].push(entry);
  });
  return workouts;
}

export async function upsertWorkoutEntry(
  date: string,
  entry: WorkoutEntry,
): Promise<void> {
  const userId = await getUserId();
  const { error } = await getSupabase().from('workout_entries').upsert(
    {
      id: entry.id,
      user_id: userId,
      log_date: date,
      name: entry.name,
      calories_burned: entry.caloriesBurned,
      duration_minutes: entry.durationMinutes ?? null,
      entry_mode: entry.entryMode,
      workout_ref: entry.workoutId ?? null,
      logged_at: entry.timestamp,
    },
    { onConflict: 'id' },
  );
  if (error) {
    throw error;
  }
}

export async function deleteWorkoutEntryRow(id: string): Promise<void> {
  const userId = await getUserId();
  const { error } = await getSupabase()
    .from('workout_entries')
    .delete()
    .eq('id', id)
    .eq('user_id', userId);
  if (error) {
    throw error;
  }
}
