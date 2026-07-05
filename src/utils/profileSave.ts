import type { UserProfile } from '../types';
import { calculateMaintenance, resolveProfileTargets } from './bmr';

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
  const { calorieAdjustment, dailyTargetCalories } = resolveProfileTargets(
    maintenanceCalories,
    merged.goalType,
    merged.weightKg,
    goalWeightKg,
    merged.gender,
  );

  return {
    ...merged,
    goalWeightKg,
    maintenanceCalories,
    calorieAdjustment,
    dailyTargetCalories,
  };
}
