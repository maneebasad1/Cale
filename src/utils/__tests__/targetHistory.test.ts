import {
  appendTargetSnapshot,
  getTargetForDate,
  seedInitialTargetSnapshot,
} from '../targetHistory';

describe('targetHistory', () => {
  const initial = seedInitialTargetSnapshot('2026-07-01', {
    dailyTargetCalories: 2000,
    maintenanceCalories: 2500,
  });

  it('returns the only snapshot for a day logged before any goal change', () => {
    const result = getTargetForDate(
      '2026-07-10',
      initial,
      { dailyTargetCalories: 1800, maintenanceCalories: 2200 },
    );
    expect(result.dailyTargetCalories).toBe(2000);
    expect(result.maintenanceCalories).toBe(2500);
  });

  it('uses the new snapshot for days on or after a mid-month goal change', () => {
    let history = appendTargetSnapshot(
      initial,
      '2026-07-15',
      { dailyTargetCalories: 1700, maintenanceCalories: 2400 },
      { dailyTargetCalories: 1700, maintenanceCalories: 2400 },
    );

    const beforeChange = getTargetForDate(
      '2026-07-14',
      history,
      { dailyTargetCalories: 999, maintenanceCalories: 999 },
    );
    expect(beforeChange.dailyTargetCalories).toBe(2000);

    const onChangeDay = getTargetForDate(
      '2026-07-15',
      history,
      { dailyTargetCalories: 999, maintenanceCalories: 999 },
    );
    expect(onChangeDay.dailyTargetCalories).toBe(1700);
    expect(onChangeDay.maintenanceCalories).toBe(2400);

    const afterChange = getTargetForDate(
      '2026-07-20',
      history,
      { dailyTargetCalories: 999, maintenanceCalories: 999 },
    );
    expect(afterChange.dailyTargetCalories).toBe(1700);
  });

  it('falls back to earliest snapshot for dates before the first effectiveFrom', () => {
    const result = getTargetForDate(
      '2026-06-20',
      initial,
      { dailyTargetCalories: 1500, maintenanceCalories: 1800 },
    );
    expect(result.dailyTargetCalories).toBe(2000);
  });

  it('does not duplicate snapshots when targets are unchanged', () => {
    const history = appendTargetSnapshot(
      initial,
      '2026-07-20',
      { dailyTargetCalories: 2000, maintenanceCalories: 2500 },
      { dailyTargetCalories: 2000, maintenanceCalories: 2500 },
    );
    expect(history).toHaveLength(1);
  });
});
