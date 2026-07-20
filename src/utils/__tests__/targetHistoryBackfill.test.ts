import {
  backfillTargetHistorySnapshots,
  inferTargetHistoryStartDate,
} from '../targetHistoryBackfill';
import { seedInitialTargetSnapshot } from '../targetHistory';

const profile = {
  dailyTargetCalories: 2000,
  maintenanceCalories: 2500,
};

describe('targetHistoryBackfill', () => {
  it('uses earliest activity date when seeding empty history', () => {
    const start = inferTargetHistoryStartDate(
      ['2026-07-15', '2026-06-01', '2026-07-02'],
      '2026-07-20',
    );
    expect(start).toBe('2026-06-01');

    const result = backfillTargetHistorySnapshots(
      [],
      profile,
      start,
      '2026-07-20',
    );
    expect(result.changed).toBe(true);
    expect(result.snapshots).toHaveLength(1);
    expect(result.snapshots[0]?.effectiveFrom).toBe('2026-06-01');
  });

  it('moves a lone today snapshot back to first activity date', () => {
    const todaySnapshot = seedInitialTargetSnapshot('2026-07-20', profile);
    const result = backfillTargetHistorySnapshots(
      todaySnapshot,
      profile,
      '2026-06-10',
      '2026-07-20',
    );
    expect(result.changed).toBe(true);
    expect(result.snapshots[0]?.effectiveFrom).toBe('2026-06-10');
    expect(result.snapshots[0]?.dailyTargetCalories).toBe(2000);
  });

  it('does not rewrite history when multiple snapshots exist', () => {
    const history = [
      ...seedInitialTargetSnapshot('2026-06-01', profile),
      {
        effectiveFrom: '2026-07-15',
        dailyTargetCalories: 1700,
        maintenanceCalories: 2400,
      },
    ];
    const result = backfillTargetHistorySnapshots(
      history,
      profile,
      '2026-05-01',
      '2026-07-20',
    );
    expect(result.changed).toBe(false);
    expect(result.snapshots).toHaveLength(2);
  });

  it('falls back to today when there is no activity', () => {
    const start = inferTargetHistoryStartDate([], '2026-07-20');
    expect(start).toBe('2026-07-20');
  });
});
