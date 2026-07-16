import { getSupabase } from '../lib/supabase';
import type { CalorieEntry, DailyLog, UserProfile } from '../types';
import type { FoodItem } from '../types/food';
import type { WeightEntry } from '../types/weight';
import {
  CalorieEntryRow,
  CustomFoodRow,
  ProfileRow,
  WeightEntryRow,
  customFoodFromRow,
  entryFromRow,
  profileFromRow,
  profileToRow,
  weightFromRow,
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
  const { data, error } = await getSupabase()
    .from('calorie_entries')
    .select('*')
    .eq('user_id', userId)
    .order('logged_at', { ascending: true });

  if (error) {
    throw error;
  }

  const logs: Record<string, DailyLog> = {};
  (data as CalorieEntryRow[]).forEach(row => {
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
  const { data, error } = await getSupabase()
    .from('custom_foods')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }
  return (data as CustomFoodRow[]).map(customFoodFromRow);
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
  const { data, error } = await getSupabase()
    .from('weight_entries')
    .select('*')
    .eq('user_id', userId)
    .order('log_date', { ascending: false });

  if (error) {
    throw error;
  }
  return (data as WeightEntryRow[]).map(weightFromRow);
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
