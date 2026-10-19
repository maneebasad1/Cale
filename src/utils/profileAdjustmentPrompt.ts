import { Alert } from 'react-native';
import type { GoalType, UserProfile } from '../types';
import {
  calculateCalorieAdjustment,
  calculateDailyTarget,
  calculateMaintenance,
  isGoalReached,
} from './bmr';

/** Below this, a weight "change" is just lb↔kg/display rounding noise. */
const WEIGHT_CHANGE_TOLERANCE_KG = 0.01;

function differs(next: number | undefined, current: number): boolean {
  return (
    next !== undefined && Math.abs(next - current) > WEIGHT_CHANGE_TOLERANCE_KG
  );
}

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

  const merged = { ...profile, ...updates };
  // A reached goal switches to maintenance regardless of the custom value, so
  // there is nothing to ask about.
  if (
    merged.goalType === 'maintain' ||
    isGoalReached(merged.goalType, merged.weightKg, merged.goalWeightKg)
  ) {
    return false;
  }

  const weightChanged = differs(updates.weightKg, profile.weightKg);
  const goalWeightChanged = differs(updates.goalWeightKg, profile.goalWeightKg);
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
