import type { TargetSnapshot } from '../types/targetHistory';

export interface TargetForDate {
  dailyTargetCalories: number;
  maintenanceCalories: number;
}

export function sortTargetSnapshots(
  snapshots: TargetSnapshot[],
): TargetSnapshot[] {
  return [...snapshots].sort((a, b) =>
    a.effectiveFrom.localeCompare(b.effectiveFrom),
  );
}

/**
 * Returns the target active on `date`: the latest snapshot with
 * effectiveFrom <= date, or the earliest snapshot for dates before the first.
 */
export function getTargetForDate(
  date: string,
  snapshots: TargetSnapshot[],
  fallback: TargetForDate,
): TargetForDate {
  if (!snapshots.length) {
    return fallback;
  }

  const sorted = sortTargetSnapshots(snapshots);
  let match: TargetSnapshot | null = null;

  for (const snapshot of sorted) {
    if (snapshot.effectiveFrom <= date) {
      match = snapshot;
    } else {
      break;
    }
  }

  if (match) {
    return {
      dailyTargetCalories: match.dailyTargetCalories,
      maintenanceCalories: match.maintenanceCalories,
    };
  }

  return {
    dailyTargetCalories: sorted[0].dailyTargetCalories,
    maintenanceCalories: sorted[0].maintenanceCalories,
  };
}

export function targetsEqual(
  a: TargetForDate,
  b: TargetForDate,
): boolean {
  return (
    a.dailyTargetCalories === b.dailyTargetCalories &&
    a.maintenanceCalories === b.maintenanceCalories
  );
}

/** Active target on `effectiveFrom` before applying a change. */
export function getPriorTargetForDate(
  effectiveFrom: string,
  snapshots: TargetSnapshot[],
  fallback: TargetForDate,
): TargetForDate {
  return getTargetForDate(effectiveFrom, snapshots, fallback);
}

/**
 * Record a target change effective from `effectiveFrom` (usually today).
 * Replaces any snapshot already stored for that date; skips if unchanged.
 */
export function appendTargetSnapshot(
  snapshots: TargetSnapshot[],
  effectiveFrom: string,
  next: TargetForDate,
  fallback: TargetForDate,
): TargetSnapshot[] {
  const prior = getPriorTargetForDate(
    effectiveFrom,
    snapshots.filter(s => s.effectiveFrom !== effectiveFrom),
    fallback,
  );

  if (targetsEqual(prior, next)) {
    return sortTargetSnapshots(snapshots);
  }

  const withoutDate = snapshots.filter(s => s.effectiveFrom !== effectiveFrom);
  return sortTargetSnapshots([
    ...withoutDate,
    {
      effectiveFrom,
      dailyTargetCalories: next.dailyTargetCalories,
      maintenanceCalories: next.maintenanceCalories,
    },
  ]);
}

export function seedInitialTargetSnapshot(
  effectiveFrom: string,
  profile: TargetForDate,
): TargetSnapshot[] {
  return [
    {
      effectiveFrom,
      dailyTargetCalories: profile.dailyTargetCalories,
      maintenanceCalories: profile.maintenanceCalories,
    },
  ];
}
