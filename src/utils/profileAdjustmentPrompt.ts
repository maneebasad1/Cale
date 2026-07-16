import { Alert } from 'react-native';
import type { GoalType, UserProfile } from '../types';
import {
  calculateCalorieAdjustment,
  calculateDailyTarget,
  calculateMaintenance,
} from './bmr';

function adjustmentLabel(goalType: GoalType, magnitude: number): string {
  const noun = goalType === 'lose' ? 'deficit' : 'surplus';
  return `${magnitude.toLocaleString()} kcal/day ${noun}`;
}

export function shouldPromptCustomAdjustmentUpdate(
  profile: UserProfile,
  updates: { weightKg?: number; goalWeightKg?: number; goalType?: GoalType },
): boolean {
  if (!profile.adjustmentIsCustom || profile.goalType === 'maintain') {
    return false;
  }

  const weightChanged =
    updates.weightKg !== undefined && updates.weightKg !== profile.weightKg;
  const goalWeightChanged =
    updates.goalWeightKg !== undefined &&
    updates.goalWeightKg !== profile.goalWeightKg;
  const goalTypeChanged =
    updates.goalType !== undefined && updates.goalType !== profile.goalType;

  return weightChanged || goalWeightChanged || goalTypeChanged;
}

export function promptCustomAdjustmentUpdate(
  profile: UserProfile,
  updates: { weightKg?: number; goalWeightKg?: number; goalType?: GoalType },
  onResolve: (useAutoAdjustment: boolean) => void,
): void {
  const merged = { ...profile, ...updates };
  const goalType = merged.goalType;
  const goalWeightKg =
    goalType === 'maintain' ? merged.weightKg : merged.goalWeightKg;
  const maintenanceCalories = calculateMaintenance(
    merged.weightKg,
    merged.heightCm,
    merged.age,
    merged.gender,
    merged.activityLevel,
  );
  const customMagnitude = Math.abs(profile.calorieAdjustment);
  const customTarget = calculateDailyTarget(
    maintenanceCalories,
    profile.calorieAdjustment,
    merged.gender,
    goalType,
  );
  const autoAdjustment = calculateCalorieAdjustment(
    goalType,
    merged.weightKg,
    goalWeightKg,
  );
  const autoMagnitude = Math.abs(autoAdjustment);
  const autoTarget = calculateDailyTarget(
    maintenanceCalories,
    autoAdjustment,
    merged.gender,
    goalType,
  );

  Alert.alert(
    'Update calorie adjustment?',
    `Your custom ${adjustmentLabel(goalType, customMagnitude)} gives a target of ${customTarget.toLocaleString()} kcal with your updated details. Auto-calculated would be ${adjustmentLabel(goalType, autoMagnitude)} (${autoTarget.toLocaleString()} kcal target).`,
    [
      {
        text: 'Keep custom',
        style: 'cancel',
        onPress: () => onResolve(false),
      },
      {
        text: 'Use auto',
        onPress: () => onResolve(true),
      },
    ],
  );
}
