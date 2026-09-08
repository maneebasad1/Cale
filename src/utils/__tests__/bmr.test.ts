import {
  calculateCalorieAdjustment,
  calculateDailyTarget,
  getOnboardingCaloriePreview,
  resolveProfileTargets,
} from '../bmr';

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
});
