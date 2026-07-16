import type { UserProfile } from '../types';
import {
  calculateCalorieAdjustment,
  calculateDailyTarget,
  calculateMaintenance,
  resolveProfileTargets,
} from './bmr';

export function buildUpdatedProfile(
  base: UserProfile,
  updates: Partial<UserProfile>,
): UserProfile {
  const merged = { ...base, ...updates };
  const maintenanceCalories = calculateMaintenance(
    merged.weightKg,
    merged.heightCm,
    merged.age,
    merged.gender,
    merged.activityLevel,
  );
  const goalWeightKg =
    merged.goalType === 'maintain' ? merged.weightKg : merged.goalWeightKg;

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

  const dailyTargetCalories = calculateDailyTarget(
    maintenanceCalories,
    calorieAdjustment,
    merged.gender,
    merged.goalType,
  );

  const adjustmentIsCustom =
    merged.goalType === 'maintain'
      ? false
      : (updates.adjustmentIsCustom ?? merged.adjustmentIsCustom ?? false);

  return {
    ...merged,
    goalWeightKg,
    maintenanceCalories,
    calorieAdjustment,
    dailyTargetCalories,
    adjustmentIsCustom,
  };
}

export function buildAutoProfileTargets(
  profile: UserProfile,
  overrides: Partial<UserProfile> = {},
): Pick<UserProfile, 'calorieAdjustment' | 'dailyTargetCalories'> {
  const merged = { ...profile, ...overrides };
  const maintenanceCalories = calculateMaintenance(
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
