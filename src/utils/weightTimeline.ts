import type { Gender, GoalType, WeightUnit } from '../types';
import {
  calculateCalorieAdjustment,
  calculateDailyTarget,
  estimateWeeklyWeightChange,
} from './bmr';
import { displayWeight, kgToLb } from './units';

export const MAX_DAILY_ADJUSTMENT = 1500;
export const KCAL_PER_KG = 7700;

const MIN_CALORIES: Record<Gender, number> = {
  male: 1500,
  female: 1200,
};

export type AdjustmentValidationError =
  | 'below_minimum'
  | 'wrong_direction'
  | 'exceeds_max'
  | 'invalid';

export function autoAdjustmentMagnitude(
  goalType: GoalType,
  currentWeightKg: number,
  goalWeightKg: number,
): number {
  if (goalType === 'maintain') {
    return 0;
  }
  return Math.abs(
    calculateCalorieAdjustment(goalType, currentWeightKg, goalWeightKg),
  );
}

export function signedAdjustment(
  goalType: GoalType,
  magnitude: number,
): number {
  if (goalType === 'maintain' || magnitude <= 0) {
    return 0;
  }
  return goalType === 'lose' ? -magnitude : magnitude;
}

export function parseAdjustmentInput(text: string): number | null {
  const trimmed = text.trim();
  if (!trimmed) {
    return null;
  }
  const num = parseFloat(trimmed);
  if (!Number.isFinite(num) || num === 0) {
    return null;
  }
  return num;
}

export function validateAdjustmentInput(params: {
  goalType: GoalType;
  rawInput: string;
  maintenanceCalories: number;
  gender: Gender;
}): AdjustmentValidationError | null {
  const { goalType, rawInput, maintenanceCalories, gender } = params;

  if (goalType === 'maintain') {
    return null;
  }

  const trimmed = rawInput.trim();
  if (!trimmed) {
    return 'invalid';
  }

  const num = parseFloat(trimmed);
  if (!Number.isFinite(num) || num === 0) {
    return 'invalid';
  }

  if ((goalType === 'lose' || goalType === 'gain') && num < 0) {
    return 'wrong_direction';
  }

  const magnitude = Math.abs(num);
  if (magnitude > MAX_DAILY_ADJUSTMENT) {
    return 'exceeds_max';
  }

  const signed = signedAdjustment(goalType, magnitude);
  const rawTarget = maintenanceCalories + signed;
  if (rawTarget < MIN_CALORIES[gender]) {
    return 'below_minimum';
  }

  return null;
}

export function adjustmentValidationMessage(
  error: AdjustmentValidationError,
  goalType: GoalType,
): string {
  switch (error) {
    case 'below_minimum':
      return 'This would put your target below a safe minimum — try a smaller adjustment.';
    case 'wrong_direction':
      return goalType === 'lose'
        ? 'Enter a deficit (positive kcal below maintenance), not a surplus.'
        : 'Enter a surplus (positive kcal above maintenance), not a deficit.';
    case 'exceeds_max':
      return `Keep your daily adjustment at or below ${MAX_DAILY_ADJUSTMENT.toLocaleString()} kcal.`;
    case 'invalid':
    default:
      return 'Enter a valid daily adjustment.';
  }
}

export function estimateWeeklyWeightChangeForUnit(
  magnitude: number,
  weightUnit: WeightUnit,
): number {
  const kgPerWeek = estimateWeeklyWeightChange(magnitude);
  if (weightUnit === 'lb') {
    return Math.round(kgToLb(kgPerWeek) * 10) / 10;
  }
  return kgPerWeek;
}

export interface GoalTimeline {
  daysToGoal: number;
  projectedDate: Date;
}

export function estimateGoalTimeline(
  currentWeightKg: number,
  goalWeightKg: number,
  magnitude: number,
): GoalTimeline | null {
  const gapKg = Math.abs(goalWeightKg - currentWeightKg);
  if (gapKg < 0.01 || magnitude <= 0) {
    return null;
  }

  const days = Math.ceil((gapKg * KCAL_PER_KG) / magnitude);
  const projectedDate = new Date();
  projectedDate.setDate(projectedDate.getDate() + days);

  return { daysToGoal: days, projectedDate };
}

export function formatTimelineDuration(days: number): string {
  if (days < 14) {
    const weeks = Math.max(1, Math.round(days / 7));
    return `about ${weeks} week${weeks === 1 ? '' : 's'}`;
  }

  const months = Math.round(days / 30);
  if (months >= 2) {
    return `about ${months} months`;
  }

  const weeks = Math.round(days / 7);
  return `about ${weeks} weeks`;
}

export function formatProjectedDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatGoalTimelineMessage(params: {
  goalWeightKg: number;
  weightUnit: WeightUnit;
  timeline: GoalTimeline;
}): string {
  const { goalWeightKg, weightUnit, timeline } = params;
  const weightStr = displayWeight(goalWeightKg, weightUnit);
  const duration = formatTimelineDuration(timeline.daysToGoal);
  const dateStr = formatProjectedDate(timeline.projectedDate);
  return `At this pace, you'll reach your goal weight of ${weightStr} in ${duration} (around ${dateStr}).`;
}

export function resolveAdjustmentPreview(params: {
  goalType: GoalType;
  magnitude: number;
  maintenanceCalories: number;
  gender: Gender;
  currentWeightKg: number;
  goalWeightKg: number;
  weightUnit: WeightUnit;
}): {
  calorieAdjustment: number;
  dailyTargetCalories: number;
  weeklyWeightChange: number;
  timeline: GoalTimeline | null;
  timelineMessage: string | null;
} {
  const {
    goalType,
    magnitude,
    maintenanceCalories,
    gender,
    currentWeightKg,
    goalWeightKg,
    weightUnit,
  } = params;

  const calorieAdjustment = signedAdjustment(goalType, magnitude);
  const dailyTargetCalories = calculateDailyTarget(
    maintenanceCalories,
    calorieAdjustment,
    gender,
    goalType,
  );
  const weeklyWeightChange = estimateWeeklyWeightChangeForUnit(
    magnitude,
    weightUnit,
  );
  const timeline = estimateGoalTimeline(
    currentWeightKg,
    goalWeightKg,
    magnitude,
  );
  const timelineMessage = timeline
    ? formatGoalTimelineMessage({ goalWeightKg, weightUnit, timeline })
    : null;

  return {
    calorieAdjustment,
    dailyTargetCalories,
    weeklyWeightChange,
    timeline,
    timelineMessage,
  };
}
