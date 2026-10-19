import type { ActivityLevel, Gender, GoalType } from '../types';

const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  lightly_active: 1.375,
  moderately_active: 1.55,
  very_active: 1.725,
  extra_active: 1.9,
};

const MIN_CALORIES: Record<Gender, number> = {
  male: 1500,
  female: 1200,
};

/** ~7,700 kcal per kg of body weight change */
const KCAL_PER_KG = 7700;

export function calculateBMR(
  weightKg: number,
  heightCm: number,
  age: number,
  gender: Gender,
): number {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  return gender === 'male' ? base + 5 : base - 161;
}

export function calculateMaintenance(
  weightKg: number,
  heightCm: number,
  age: number,
  gender: Gender,
  activityLevel: ActivityLevel,
): number {
  const bmr = calculateBMR(weightKg, heightCm, age, gender);
  return Math.round(bmr * ACTIVITY_MULTIPLIERS[activityLevel]);
}

/** Tolerance so float noise from lb↔kg conversions doesn't block "reached". */
const GOAL_REACHED_TOLERANCE_KG = 0.01;

/**
 * True when the current weight is already at or past the goal in the goal's
 * direction (lose: current <= goal, gain: current >= goal). Maintain never
 * "reaches" anything.
 */
export function isGoalReached(
  goalType: GoalType,
  currentWeightKg: number,
  goalWeightKg: number,
): boolean {
  if (goalType === 'lose') {
    return currentWeightKg <= goalWeightKg + GOAL_REACHED_TOLERANCE_KG;
  }
  if (goalType === 'gain') {
    return currentWeightKg >= goalWeightKg - GOAL_REACHED_TOLERANCE_KG;
  }
  return false;
}

export function calculateCalorieAdjustment(
  goalType: GoalType,
  currentWeightKg: number,
  goalWeightKg: number,
): number {
  if (goalType === 'maintain') {
    return 0;
  }

  // Goal reached or overshot: eat at maintenance instead of continuing the
  // deficit/surplus past the goal.
  if (isGoalReached(goalType, currentWeightKg, goalWeightKg)) {
    return 0;
  }

  const diffKg = Math.abs(goalWeightKg - currentWeightKg);
  const kgPerWeek =
    goalType === 'lose'
      ? Math.min(0.75, Math.max(0.25, diffKg >= 5 ? 0.5 : 0.35))
      : Math.min(0.5, Math.max(0.2, diffKg >= 5 ? 0.35 : 0.25));

  const daily = Math.round((kgPerWeek * KCAL_PER_KG) / 7);
  return goalType === 'lose' ? -daily : daily;
}

export function calculateDailyTarget(
  maintenanceCalories: number,
  calorieAdjustment: number,
  gender: Gender,
  goalType: GoalType = 'lose',
): number {
  // Maintain gets the same safety floor so a bad maintenance estimate (or a
  // low custom value) can't produce a negative/absurd target.
  const raw =
    goalType === 'maintain'
      ? maintenanceCalories
      : maintenanceCalories + calorieAdjustment;
  return Math.max(MIN_CALORIES[gender], Math.round(raw));
}

export function resolveProfileTargets(
  maintenanceCalories: number,
  goalType: GoalType,
  currentWeightKg: number,
  goalWeightKg: number,
  gender: Gender,
): {
  calorieAdjustment: number;
  dailyTargetCalories: number;
} {
  const calorieAdjustment =
    goalType === 'maintain'
      ? 0
      : calculateCalorieAdjustment(goalType, currentWeightKg, goalWeightKg);
  const dailyTargetCalories = calculateDailyTarget(
    maintenanceCalories,
    calorieAdjustment,
    gender,
    goalType,
  );

  return { calorieAdjustment, dailyTargetCalories };
}

export function estimateWeeklyWeightChange(calorieAdjustment: number): number {
  const weeklyKcal = Math.abs(calorieAdjustment) * 7;
  return Math.round((weeklyKcal / KCAL_PER_KG) * 10) / 10;
}

/** Calorie numbers we can show as soon as age + gender exist (onboarding step 2). */
export function getOnboardingCaloriePreview(
  weightKg: number,
  heightCm: number,
  age: number,
  gender: Gender,
): {
  bmr: number;
  typicalDaily: number;
  sedentaryDaily: number;
  extraActiveDaily: number;
} {
  return {
    bmr: Math.round(calculateBMR(weightKg, heightCm, age, gender)),
    typicalDaily: calculateMaintenance(
      weightKg,
      heightCm,
      age,
      gender,
      'moderately_active',
    ),
    sedentaryDaily: calculateMaintenance(
      weightKg,
      heightCm,
      age,
      gender,
      'sedentary',
    ),
    extraActiveDaily: calculateMaintenance(
      weightKg,
      heightCm,
      age,
      gender,
      'extra_active',
    ),
  };
}
