import type { DailyLog } from '../../types';
import {
  getPeriodSummary,
  getTrailingAverageCalories,
} from '../calorieStats';

describe('calorieStats utils', () => {
  const logs: Record<string, DailyLog> = {
    '2026-07-01': {
      date: '2026-07-01',
      entries: [{ id: '1', mealType: 'lunch', calories: 1000, timestamp: '' }],
    },
    '2026-07-02': {
      date: '2026-07-02',
      entries: [{ id: '2', mealType: 'lunch', calories: 2000, timestamp: '' }],
    },
  };

  it('computes trailing average including zero days', () => {
    expect(getTrailingAverageCalories(logs, '2026-07-02', 2)).toBe(1500);
  });

  it('summarizes period stats', () => {
    const summary = getPeriodSummary(logs, '2026-07-01', '2026-07-02', 1800, 'lose');
    expect(summary.averageDailyCalories).toBe(1500);
    expect(summary.days).toHaveLength(2);
    expect(summary.bestDay?.date).toBe('2026-07-01');
  });
});
