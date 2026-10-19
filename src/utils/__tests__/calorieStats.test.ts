import type { DailyLog } from '../../types';
import {
  getPeriodSummary,
  getTrailingAverageCalories,
} from '../calorieStats';

function log(date: string, ...calories: number[]): DailyLog {
  return {
    date,
    entries: calories.map((kcal, i) => ({
      id: `${date}-${i}`,
      mealType: 'lunch',
      calories: kcal,
      timestamp: '',
    })),
  };
}

describe('calorieStats utils', () => {
  const logs: Record<string, DailyLog> = {
    '2026-07-01': log('2026-07-01', 1000),
    '2026-07-02': log('2026-07-02', 2000),
  };

  describe('getTrailingAverageCalories', () => {
    it('averages logged days in the window', () => {
      expect(getTrailingAverageCalories(logs, '2026-07-02', 2)).toBe(1500);
    });

    it('ignores unlogged days instead of counting them as zero', () => {
      // 7-day window ending 07-05 only has 07-01 and 07-02 logged.
      expect(getTrailingAverageCalories(logs, '2026-07-05', 7)).toBe(1500);
    });

    it('ignores days whose log exists but has no entries', () => {
      const withEmpty = { ...logs, '2026-07-03': log('2026-07-03') };
      expect(getTrailingAverageCalories(withEmpty, '2026-07-03', 3)).toBe(
        1500,
      );
    });

    it('returns 0 when nothing is logged', () => {
      expect(getTrailingAverageCalories({}, '2026-07-05', 7)).toBe(0);
    });
  });

  describe('getPeriodSummary', () => {
    it('summarizes period stats', () => {
      const summary = getPeriodSummary(
        logs,
        '2026-07-01',
        '2026-07-02',
        () => 1800,
        'lose',
        {},
        '2026-07-10',
      );
      expect(summary.averageDailyCalories).toBe(1500);
      expect(summary.days).toHaveLength(2);
      expect(summary.days.every(day => day.logged)).toBe(true);
      expect(summary.bestDay?.date).toBe('2026-07-01');
      expect(summary.worstDay?.date).toBe('2026-07-02');
    });

    it('excludes unlogged days from average and ranking', () => {
      const summary = getPeriodSummary(
        logs,
        '2026-06-28',
        '2026-07-04',
        () => 1800,
        'lose',
        {},
        '2026-07-10',
      );
      expect(summary.days).toHaveLength(7);
      expect(summary.days.filter(day => !day.logged)).toHaveLength(5);
      expect(summary.averageDailyCalories).toBe(1500);
      // An unlogged 0-kcal day must not win "Best day" for a lose goal.
      expect(summary.bestDay?.date).toBe('2026-07-01');
      expect(summary.worstDay?.date).toBe('2026-07-02');
    });

    it('excludes today (in progress) from ranking but not the average', () => {
      const withToday = { ...logs, '2026-07-03': log('2026-07-03', 300) };
      const summary = getPeriodSummary(
        withToday,
        '2026-07-01',
        '2026-07-03',
        () => 1800,
        'lose',
        {},
        '2026-07-03',
      );
      expect(summary.averageDailyCalories).toBe(1100);
      expect(summary.bestDay?.date).toBe('2026-07-01');
      expect(summary.worstDay?.date).toBe('2026-07-02');
    });

    it('ranks maintain goals by distance from target', () => {
      const summary = getPeriodSummary(
        { ...logs, '2026-07-03': log('2026-07-03', 1850) },
        '2026-07-01',
        '2026-07-03',
        () => 1800,
        'maintain',
        {},
        '2026-07-10',
      );
      expect(summary.bestDay?.date).toBe('2026-07-03');
      expect(summary.worstDay?.date).toBe('2026-07-01');
    });

    it('returns no best/worst when no completed day is logged', () => {
      const summary = getPeriodSummary(
        { '2026-07-03': log('2026-07-03', 500) },
        '2026-07-01',
        '2026-07-03',
        () => 1800,
        'lose',
        {},
        '2026-07-03',
      );
      expect(summary.averageDailyCalories).toBe(500);
      expect(summary.bestDay).toBeNull();
      expect(summary.worstDay).toBeNull();
    });

    it('does not repeat a single ranked day as both best and worst', () => {
      const summary = getPeriodSummary(
        { '2026-07-01': log('2026-07-01', 1000) },
        '2026-07-01',
        '2026-07-03',
        () => 1800,
        'gain',
        {},
        '2026-07-10',
      );
      expect(summary.bestDay?.date).toBe('2026-07-01');
      expect(summary.worstDay).toBeNull();
    });
  });
});
