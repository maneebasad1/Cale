import type { TargetSnapshot } from '../types/targetHistory';
import { seedInitialTargetSnapshot, sortTargetSnapshots } from './targetHistory';
import type { TargetForDate } from './targetHistory';

/** Earliest YYYY-MM-DD from activity, or `fallback` when none exist. */
export function inferTargetHistoryStartDate(
  activityDates: string[],
  fallback: string,
): string {
  const valid = activityDates.filter(Boolean);
  if (!valid.length) {
    return fallback;
  }
  return valid.reduce((earliest, date) =>
    date < earliest ? date : earliest,
  );
}

export interface TargetHistoryBackfillResult {
  snapshots: TargetSnapshot[];
  changed: boolean;
}

/**
 * Seeds or corrects the initial target snapshot so past logged days use a
 * target that predates (or matches) the user's first activity.
 */
export function backfillTargetHistorySnapshots(
  snapshots: TargetSnapshot[],
  profile: TargetForDate,
  earliestActivityDate: string,
  today: string,
): TargetHistoryBackfillResult {
  const startDate =
    earliestActivityDate <= today ? earliestActivityDate : today;

  if (!snapshots.length) {
    return {
      snapshots: seedInitialTargetSnapshot(startDate, profile),
      changed: true,
    };
  }

  if (snapshots.length === 1) {
    const only = snapshots[0]!;
    if (only.effectiveFrom > startDate) {
      return {
        snapshots: sortTargetSnapshots([
          { ...only, effectiveFrom: startDate },
        ]),
        changed: true,
      };
    }
  }

  return { snapshots: sortTargetSnapshots(snapshots), changed: false };
}

export function collectActivityDates(
  logDates: string[],
  workoutDates: string[],
  weightDates: string[],
): string[] {
  return [...logDates, ...workoutDates, ...weightDates];
}
