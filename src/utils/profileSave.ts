import type { UserProfile } from '../types';
import {
  calculateCalorieAdjustment,
  calculateDailyTarget,
  calculateMaintenance,
  isGoalReached,
  resolveProfileTargets,
} from './bmr';

export function buildUpdatedProfile(
  base: UserProfile,
  updates: Partial<UserProfile>,
): UserProfile {
  const merged = { ...base, ...updates };
  const goalWeightKg =
    merged.goalType === 'maintain' ? merged.weightKg : merged.goalWeightKg;

  const preserveCustomMaintenance =
    merged.maintenanceIsCustom &&
    updates.maintenanceCalories === undefined &&
    updates.maintenanceIsCustom !== false;

  let maintenanceCalories: number;
  if (preserveCustomMaintenance) {
    maintenanceCalories = merged.maintenanceCalories;
  } else if (updates.maintenanceCalories !== undefined) {
    maintenanceCalories = updates.maintenanceCalories;
  } else {
    maintenanceCalories = calculateMaintenance(
      merged.weightKg,
      merged.heightCm,
      merged.age,
      merged.gender,
      merged.activityLevel,
    );
  }

  const preserveCustomAdjustment =
    merged.adjustmentIsCustom &&
    merged.goalType !== 'maintain' &&
    updates.calorieAdjustment === undefined;

  let calorieAdjustment: number;
  if (merged.goalType === 'maintain') {
    calorieAdjustment = 0;
  } else if (updates.calorieAdjustment !== undefined) {
    calorieAdjustment = updates.calorieAdjustment;
  } else if (preserveCustomAdjustment) {
    calorieAdjustment = merged.calorieAdjustment;
  } else {
    calorieAdjustment = calculateCalorieAdjustment(
      merged.goalType,
      merged.weightKg,
      goalWeightKg,
    );
  }

  // Once the goal is reached (or overshot) stop the deficit/surplus — even a
  // custom one — and target maintenance until the user sets a new goal.
  const goalReached =
    merged.goalType !== 'maintain' &&
    isGoalReached(merged.goalType, merged.weightKg, goalWeightKg);
  if (goalReached) {
    calorieAdjustment = 0;
  }

  const dailyTargetCalories = calculateDailyTarget(
    maintenanceCalories,
    calorieAdjustment,
    merged.gender,
    merged.goalType,
  );

  const maintenanceIsCustom =
    updates.maintenanceIsCustom ?? merged.maintenanceIsCustom ?? false;

  const adjustmentIsCustom =
    merged.goalType === 'maintain' || goalReached
      ? false
      : (updates.adjustmentIsCustom ?? merged.adjustmentIsCustom ?? false);

  return {
    ...merged,
    goalWeightKg,
    maintenanceCalories,
    calorieAdjustment,
    dailyTargetCalories,
    maintenanceIsCustom,
    adjustmentIsCustom,
  };
}

export function buildAutoProfileTargets(
  profile: UserProfile,
  overrides: Partial<UserProfile> = {},
): Pick<UserProfile, 'calorieAdjustment' | 'dailyTargetCalories'> {
  const merged = { ...profile, ...overrides };
  const maintenanceCalories =
    merged.maintenanceIsCustom && overrides.maintenanceCalories === undefined
      ? merged.maintenanceCalories
      : calculateMaintenance(
          merged.weightKg,
          merged.heightCm,
          merged.age,
          merged.gender,
          merged.activityLevel,
        );
  const goalWeightKg =
    merged.goalType === 'maintain' ? merged.weightKg : merged.goalWeightKg;
  return resolveProfileTargets(
    maintenanceCalories,
    merged.goalType,
    merged.weightKg,
    goalWeightKg,
    merged.gender,
  );
}
