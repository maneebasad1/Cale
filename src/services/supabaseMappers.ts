import type { CalorieEntry, MealReminders, UserProfile } from '../types';
import { DEFAULT_MEAL_REMINDERS, MEAL_REMINDER_MEALS } from '../types';
import { isAnyMealReminderEnabled, resolveMealReminders } from '../utils/mealReminders';
import { isWorkoutReminderEnabled, resolveWorkoutReminder } from '../utils/workoutReminders';
import type { FoodItem } from '../types/food';
import type { TargetSnapshot } from '../types/targetHistory';
import type { WeightEntry } from '../types/weight';
import type { WorkoutEntry } from '../types/workout';

export interface ProfileRow {
  id: string;
  weight_kg: number;
  height_cm: number;
  age: number;
  gender: UserProfile['gender'];
  activity_level: UserProfile['activityLevel'];
  maintenance_calories: number;
  maintenance_is_custom: boolean | null;
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
  workout_reminder: UserProfile['workoutReminder'] | null;
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

export interface TargetHistoryRow {
  id: string;
  user_id: string;
  effective_from: string;
  daily_target_calories: number;
  maintenance_calories: number;
}

export interface WorkoutEntryRow {
  id: string;
  user_id: string;
  log_date: string;
  name: string;
  calories_burned: number;
  duration_minutes: number | null;
  entry_mode: WorkoutEntry['entryMode'];
  workout_ref: string | null;
  logged_at: string;
}

export function profileFromRow(row: ProfileRow): UserProfile {
  return {
    weightKg: row.weight_kg,
    heightCm: row.height_cm,
    age: row.age,
    gender: row.gender,
    activityLevel: row.activity_level,
    maintenanceCalories: row.maintenance_calories,
    maintenanceIsCustom: row.maintenance_is_custom ?? undefined,
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
    workoutReminder: row.workout_reminder ?? undefined,
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
    maintenance_is_custom: profile.maintenanceIsCustom ?? false,
    goal_type: profile.goalType,
    goal_weight_kg: profile.goalWeightKg,
    calorie_adjustment: profile.calorieAdjustment,
    daily_target_calories: profile.dailyTargetCalories,
    adjustment_is_custom: profile.adjustmentIsCustom ?? false,
    weight_unit: profile.weightUnit,
    height_unit: profile.heightUnit,
    onboarding_complete: profile.onboardingComplete,
    reminder_enabled:
      isAnyMealReminderEnabled(profile) || isWorkoutReminderEnabled(profile),
    reminder_time_minutes:
      mealReminders?.dinner.timeMinutes ??
      profile.reminderTimeMinutes ??
      DEFAULT_MEAL_REMINDERS.dinner.timeMinutes,
    meal_reminders: mealReminders,
    workout_reminder: resolveWorkoutReminder(profile),
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

export function targetSnapshotFromRow(row: TargetHistoryRow): TargetSnapshot {
  return {
    effectiveFrom: row.effective_from,
    dailyTargetCalories: row.daily_target_calories,
    maintenanceCalories: row.maintenance_calories,
  };
}

export function targetSnapshotToRow(
  userId: string,
  snapshot: TargetSnapshot,
): Omit<TargetHistoryRow, 'id'> & { id?: string } {
  return {
    user_id: userId,
    effective_from: snapshot.effectiveFrom,
    daily_target_calories: snapshot.dailyTargetCalories,
    maintenance_calories: snapshot.maintenanceCalories,
  };
}

export function workoutFromRow(row: WorkoutEntryRow): WorkoutEntry {
  return {
    id: row.id,
    date: row.log_date,
    name: row.name,
    caloriesBurned: row.calories_burned,
    durationMinutes: row.duration_minutes ?? undefined,
    entryMode: row.entry_mode,
    workoutId: row.workout_ref ?? undefined,
    timestamp: row.logged_at,
  };
}
