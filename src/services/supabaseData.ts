import { getSupabase } from '../lib/supabase';
import type { CalorieEntry, DailyLog, UserProfile } from '../types';
import type { FoodItem } from '../types/food';
import type { WeightEntry } from '../types/weight';
import type { CustomFoodInput } from './customFoodService';
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

async function getUserId(): Promise<string> {
  const { data, error } = await getSupabase().auth.getUser();
  if (error || !data.user) {
    throw new Error('Not authenticated');
  }
  return data.user.id;
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

export async function insertEntry(
  date: string,
  entry: Omit<CalorieEntry, 'id' | 'timestamp'>,
): Promise<CalorieEntry> {
  const userId = await getUserId();
  const loggedAt = new Date().toISOString();
  const { data, error } = await getSupabase()
    .from('calorie_entries')
    .insert({
      user_id: userId,
      log_date: date,
      meal_type: entry.mealType,
      calories: entry.calories,
      entry_mode: entry.entryMode ?? null,
      food_name: entry.foodName ?? null,
      food_id: entry.foodId ?? null,
      serving_label: entry.servingLabel ?? null,
      logged_at: loggedAt,
    })
    .select('*')
    .single();

  if (error || !data) {
    throw error ?? new Error('Failed to insert entry');
  }
  return entryFromRow(data as CalorieEntryRow);
}

export async function patchEntry(
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
  const userId = await getUserId();
  const payload: Record<string, unknown> = {};
  if (updates.mealType !== undefined) payload.meal_type = updates.mealType;
  if (updates.calories !== undefined) payload.calories = updates.calories;
  if (updates.entryMode !== undefined) payload.entry_mode = updates.entryMode;
  if (updates.foodName !== undefined) payload.food_name = updates.foodName;
  if (updates.foodId !== undefined) payload.food_id = updates.foodId;
  if (updates.servingLabel !== undefined) {
    payload.serving_label = updates.servingLabel;
  }

  const { error } = await getSupabase()
    .from('calorie_entries')
    .update(payload)
    .eq('id', entryId)
    .eq('user_id', userId);

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

export async function insertEntries(
  date: string,
  entries: Omit<CalorieEntry, 'id' | 'timestamp'>[],
): Promise<number> {
  let count = 0;
  for (const entry of entries) {
    await insertEntry(date, entry);
    count += 1;
  }
  return count;
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

export async function fetchCustomFoodById(
  id: string,
): Promise<FoodItem | undefined> {
  const userId = await getUserId();
  const { data, error } = await getSupabase()
    .from('custom_foods')
    .select('*')
    .eq('user_id', userId)
    .eq('id', id)
    .maybeSingle();

  if (error) {
    throw error;
  }
  return data ? customFoodFromRow(data as CustomFoodRow) : undefined;
}

export async function insertCustomFood(
  input: CustomFoodInput,
): Promise<FoodItem> {
  const userId = await getUserId();
  const { data, error } = await getSupabase()
    .from('custom_foods')
    .insert({
      user_id: userId,
      name: input.name.trim(),
      calories: input.calories,
      serving_label: input.servingLabel?.trim() || '1 serving',
    })
    .select('*')
    .single();

  if (error || !data) {
    throw error ?? new Error('Failed to save food');
  }
  return customFoodFromRow(data as CustomFoodRow);
}

export async function updateCustomFoodRow(
  id: string,
  input: CustomFoodInput,
): Promise<FoodItem | undefined> {
  const userId = await getUserId();
  const { data, error } = await getSupabase()
    .from('custom_foods')
    .update({
      name: input.name.trim(),
      calories: input.calories,
      serving_label: input.servingLabel?.trim() || '1 serving',
    })
    .eq('id', id)
    .eq('user_id', userId)
    .select('*')
    .maybeSingle();

  if (error) {
    throw error;
  }
  return data ? customFoodFromRow(data as CustomFoodRow) : undefined;
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

export async function upsertWeightEntry(
  weightKg: number,
  date: string,
): Promise<WeightEntry> {
  const userId = await getUserId();
  const { data, error } = await getSupabase()
    .from('weight_entries')
    .upsert(
      {
        user_id: userId,
        log_date: date,
        weight_kg: weightKg,
      },
      { onConflict: 'user_id,log_date' },
    )
    .select('*')
    .single();

  if (error || !data) {
    throw error ?? new Error('Failed to save weight');
  }
  return weightFromRow(data as WeightEntryRow);
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
