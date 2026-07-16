import type { CalorieEntry, MealReminders, UserProfile } from '../types';
import { DEFAULT_MEAL_REMINDERS, MEAL_REMINDER_MEALS } from '../types';
import { isAnyMealReminderEnabled, resolveMealReminders } from '../utils/mealReminders';
import type { FoodItem } from '../types/food';
import type { WeightEntry } from '../types/weight';

export interface ProfileRow {
  id: string;
  weight_kg: number;
  height_cm: number;
  age: number;
  gender: UserProfile['gender'];
  activity_level: UserProfile['activityLevel'];
  maintenance_calories: number;
  goal_type: UserProfile['goalType'];
  goal_weight_kg: number;
  calorie_adjustment: number;
  daily_target_calories: number;
  adjustment_is_custom: boolean | null;
  weight_unit: UserProfile['weightUnit'];
  height_unit: UserProfile['heightUnit'];
  onboarding_complete: boolean;
  reminder_enabled: boolean | null;
  reminder_time_minutes: number | null;
  meal_reminders: UserProfile['mealReminders'] | null;
  last_weight_prompt_date: string | null;
}

export interface CalorieEntryRow {
  id: string;
  user_id: string;
  log_date: string;
  meal_type: CalorieEntry['mealType'];
  calories: number;
  entry_mode: CalorieEntry['entryMode'] | null;
  food_name: string | null;
  food_id: string | null;
  serving_label: string | null;
  logged_at: string;
}

export interface CustomFoodRow {
  id: string;
  user_id: string;
  name: string;
  calories: number;
  serving_label: string;
  created_at: string;
}

export interface WeightEntryRow {
  id: string;
  user_id: string;
  log_date: string;
  weight_kg: number;
  created_at: string;
}

export function profileFromRow(row: ProfileRow): UserProfile {
  return {
    weightKg: row.weight_kg,
    heightCm: row.height_cm,
    age: row.age,
    gender: row.gender,
    activityLevel: row.activity_level,
    maintenanceCalories: row.maintenance_calories,
    goalType: row.goal_type,
    goalWeightKg: row.goal_weight_kg,
    calorieAdjustment: row.calorie_adjustment,
    dailyTargetCalories: row.daily_target_calories,
    adjustmentIsCustom: row.adjustment_is_custom ?? undefined,
    weightUnit: row.weight_unit,
    heightUnit: row.height_unit,
    onboardingComplete: row.onboarding_complete,
    reminderEnabled: row.reminder_enabled ?? undefined,
    reminderTimeMinutes: row.reminder_time_minutes ?? undefined,
    mealReminders: row.meal_reminders ?? undefined,
    lastWeightPromptDate: row.last_weight_prompt_date ?? undefined,
  };
}

function mealRemindersToRow(profile: UserProfile): MealReminders {
  return resolveMealReminders(profile);
}

export function profileToRow(userId: string, profile: UserProfile): ProfileRow {
  const mealReminders = mealRemindersToRow(profile);

  return {
    id: userId,
    weight_kg: profile.weightKg,
    height_cm: profile.heightCm,
    age: profile.age,
    gender: profile.gender,
    activity_level: profile.activityLevel,
    maintenance_calories: profile.maintenanceCalories,
    goal_type: profile.goalType,
    goal_weight_kg: profile.goalWeightKg,
    calorie_adjustment: profile.calorieAdjustment,
    daily_target_calories: profile.dailyTargetCalories,
    adjustment_is_custom: profile.adjustmentIsCustom ?? false,
    weight_unit: profile.weightUnit,
    height_unit: profile.heightUnit,
    onboarding_complete: profile.onboardingComplete,
    reminder_enabled: isAnyMealReminderEnabled(profile),
    reminder_time_minutes:
      mealReminders?.dinner.timeMinutes ??
      profile.reminderTimeMinutes ??
      DEFAULT_MEAL_REMINDERS.dinner.timeMinutes,
    meal_reminders: mealReminders,
    last_weight_prompt_date: profile.lastWeightPromptDate ?? null,
  };
}

export function entryFromRow(row: CalorieEntryRow): CalorieEntry {
  return {
    id: row.id,
    mealType: row.meal_type,
    calories: row.calories,
    timestamp: row.logged_at,
    entryMode: row.entry_mode ?? undefined,
    foodName: row.food_name ?? undefined,
    foodId: row.food_id ?? undefined,
    servingLabel: row.serving_label ?? undefined,
  };
}

export function customFoodFromRow(row: CustomFoodRow): FoodItem {
  return {
    id: row.id,
    name: row.name,
    calories: row.calories,
    servingLabel: row.serving_label,
    region: 'general',
    source: 'user',
  };
}

export function weightFromRow(row: WeightEntryRow): WeightEntry {
  return {
    id: row.id,
    date: row.log_date,
    weightKg: row.weight_kg,
  };
}
