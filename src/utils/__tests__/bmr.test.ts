import {
  calculateCalorieAdjustment,
  calculateDailyTarget,
  getOnboardingCaloriePreview,
  isGoalReached,
  resolveProfileTargets,
} from '../bmr';
import { buildUpdatedProfile } from '../profileSave';
import { shouldPromptCustomAdjustmentUpdate } from '../profileAdjustmentPrompt';
import type { UserProfile } from '../../types';

describe('bmr utils', () => {
  it('returns zero adjustment for maintain goal', () => {
    expect(calculateCalorieAdjustment('maintain', 80, 80)).toBe(0);
  });

  it('sets daily target to maintenance for maintain goal', () => {
    const result = resolveProfileTargets(2200, 'maintain', 80, 80, 'male');
    expect(result.calorieAdjustment).toBe(0);
    expect(result.dailyTargetCalories).toBe(2200);
  });

  it('applies deficit for lose goal', () => {
    const adjustment = calculateCalorieAdjustment('lose', 90, 80);
    expect(adjustment).toBeLessThan(0);
    const target = calculateDailyTarget(2200, adjustment, 'male', 'lose');
    expect(target).toBeLessThan(2200);
  });

  it('unlocks a calorie preview from weight, height, age, and gender', () => {
    const preview = getOnboardingCaloriePreview(70, 175, 30, 'male');
    expect(preview.bmr).toBe(1649);
    expect(preview.typicalDaily).toBeGreaterThan(preview.bmr);
    expect(preview.sedentaryDaily).toBeLessThan(preview.typicalDaily);
    expect(preview.extraActiveDaily).toBeGreaterThan(preview.typicalDaily);
  });

  it('floors the maintain target at the safe minimum', () => {
    expect(calculateDailyTarget(-500, 0, 'male', 'maintain')).toBe(1500);
    expect(calculateDailyTarget(900, 0, 'female', 'maintain')).toBe(1200);
    expect(calculateDailyTarget(2200, 0, 'female', 'maintain')).toBe(2200);
  });

  it('detects a reached or overshot goal in the goal direction', () => {
    expect(isGoalReached('lose', 80, 80)).toBe(true);
    expect(isGoalReached('lose', 78, 80)).toBe(true);
    expect(isGoalReached('lose', 82, 80)).toBe(false);
    expect(isGoalReached('gain', 70, 70)).toBe(true);
    expect(isGoalReached('gain', 72, 70)).toBe(true);
    expect(isGoalReached('gain', 68, 70)).toBe(false);
    expect(isGoalReached('maintain', 70, 70)).toBe(false);
  });

  it('drops the adjustment to zero once the goal is reached', () => {
    expect(calculateCalorieAdjustment('lose', 79, 80)).toBe(0);
    expect(calculateCalorieAdjustment('gain', 71, 70)).toBe(0);
    const targets = resolveProfileTargets(2200, 'lose', 79, 80, 'male');
    expect(targets.calorieAdjustment).toBe(0);
    expect(targets.dailyTargetCalories).toBe(2200);
  });
});

describe('buildUpdatedProfile goal reached', () => {
  const base: UserProfile = {
    weightKg: 85,
    heightCm: 180,
    age: 30,
    gender: 'male',
    activityLevel: 'moderately_active',
    maintenanceCalories: 2700,
    goalType: 'lose',
    goalWeightKg: 80,
    calorieAdjustment: -600,
    dailyTargetCalories: 2100,
    adjustmentIsCustom: true,
    maintenanceIsCustom: true,
    weightUnit: 'kg',
    heightUnit: 'cm',
    onboardingComplete: true,
  } as UserProfile;

  it('keeps a custom deficit while above the goal', () => {
    const updated = buildUpdatedProfile(base, { weightKg: 83 });
    expect(updated.calorieAdjustment).toBe(-600);
    expect(updated.dailyTargetCalories).toBe(2100);
  });

  it('switches to maintenance when the goal is reached', () => {
    const updated = buildUpdatedProfile(base, { weightKg: 79.5 });
    expect(updated.calorieAdjustment).toBe(0);
    expect(updated.dailyTargetCalories).toBe(2700);
    expect(updated.adjustmentIsCustom).toBe(false);
  });

  it('does not prompt about a custom adjustment for rounding-level changes', () => {
    expect(
      shouldPromptCustomAdjustmentUpdate(base, { weightKg: 85.004 }),
    ).toBe(false);
    expect(shouldPromptCustomAdjustmentUpdate(base, { weightKg: 84 })).toBe(
      true,
    );
    expect(shouldPromptCustomAdjustmentUpdate(base, { weightKg: 79 })).toBe(
      false,
    );
  });
});
