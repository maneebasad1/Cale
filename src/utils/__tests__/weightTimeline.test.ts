import {
  autoAdjustmentMagnitude,
  estimateGoalTimeline,
  formatGoalTimelineMessage,
  formatTimelineDuration,
  signedAdjustment,
  validateAdjustmentInput,
} from '../weightTimeline';

describe('weightTimeline utils', () => {
  it('returns positive auto magnitude for lose goal', () => {
    const magnitude = autoAdjustmentMagnitude('lose', 90, 80);
    expect(magnitude).toBeGreaterThan(0);
  });

  it('signs adjustment based on goal type', () => {
    expect(signedAdjustment('lose', 500)).toBe(-500);
    expect(signedAdjustment('gain', 500)).toBe(500);
    expect(signedAdjustment('maintain', 500)).toBe(0);
  });

  it('rejects deficit input that is below safe minimum', () => {
    const error = validateAdjustmentInput({
      goalType: 'lose',
      rawInput: '1200',
      maintenanceCalories: 1600,
      gender: 'female',
    });
    expect(error).toBe('below_minimum');
  });

  it('rejects wrong-direction surplus while losing', () => {
    const error = validateAdjustmentInput({
      goalType: 'lose',
      rawInput: '-500',
      maintenanceCalories: 2200,
      gender: 'male',
    });
    expect(error).toBe('wrong_direction');
  });

  it('estimates goal timeline from adjustment magnitude', () => {
    const timeline = estimateGoalTimeline(80, 75, 500);
    expect(timeline).not.toBeNull();
    expect(timeline?.daysToGoal).toBeGreaterThan(0);
  });

  it('skips timeline when already at goal weight', () => {
    expect(estimateGoalTimeline(80, 80, 500)).toBeNull();
  });

  it('formats timeline duration and message', () => {
    const days = 98;
    expect(formatTimelineDuration(days)).toContain('month');
    const message = formatGoalTimelineMessage({
      goalWeightKg: 68,
      weightUnit: 'kg',
      timeline: {
        daysToGoal: days,
        projectedDate: new Date('2026-10-20'),
      },
    });
    expect(message).toContain('68 kg');
    expect(message).toContain('October');
  });
});
