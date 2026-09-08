import type { DailyLog } from '../../types';
import { countLoggedDays, getCurrentStreak } from '../streak';

describe('getCurrentStreak', () => {
  const logs: Record<string, DailyLog> = {
    '2026-07-01': {
      date: '2026-07-01',
      entries: [{ id: '1', mealType: 'lunch', calories: 500, timestamp: '' }],
    },
    '2026-07-02': {
      date: '2026-07-02',
      entries: [{ id: '2', mealType: 'lunch', calories: 600, timestamp: '' }],
    },
    '2026-07-03': {
      date: '2026-07-03',
      entries: [{ id: '3', mealType: 'lunch', calories: 700, timestamp: '' }],
    },
  };

  it('counts consecutive days ending today', () => {
    expect(getCurrentStreak(logs, '2026-07-03')).toBe(3);
  });

  it('does not break streak when today is empty but yesterday has entries', () => {
    expect(getCurrentStreak(logs, '2026-07-04')).toBe(3);
  });

  it('returns zero when no recent entries exist', () => {
    expect(getCurrentStreak({}, '2026-07-04')).toBe(0);
  });

  it('counts unique days that have at least one entry', () => {
    expect(countLoggedDays(logs)).toBe(3);
    expect(
      countLoggedDays({
        ...logs,
        '2026-07-05': { date: '2026-07-05', entries: [] },
      }),
    ).toBe(3);
  });
});
