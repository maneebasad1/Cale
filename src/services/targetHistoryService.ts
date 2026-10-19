import AsyncStorage from '@react-native-async-storage/async-storage';
import type { TargetSnapshot } from '../types/targetHistory';
import type { UserProfile } from '../types';
import { formatDateKey } from '../utils/date';
import {
  appendTargetSnapshot,
  getTargetForDate,
  seedInitialTargetSnapshot,
  sortTargetSnapshots,
  type TargetForDate,
} from '../utils/targetHistory';
import {
  backfillTargetHistorySnapshots,
  collectActivityDates,
  inferTargetHistoryStartDate,
} from '../utils/targetHistoryBackfill';
import { LOCAL_KEYS } from './localKeys';
import {
  localGetAllLogs,
  localGetAllWorkouts,
  localGetTargetHistory,
  localGetWeightEntries,
  localSaveTargetHistory,
  localUpdateTargetHistory,
} from './localStore';
import { enqueueSync } from './syncQueue';

function profileTargets(profile: UserProfile): TargetForDate {
  return {
    dailyTargetCalories: profile.dailyTargetCalories,
    maintenanceCalories: profile.maintenanceCalories,
  };
}

export async function getTargetHistory(): Promise<TargetSnapshot[]> {
  return localGetTargetHistory();
}

export async function getTargetForDateResolved(
  date: string,
  profile: UserProfile | null,
): Promise<TargetForDate> {
  if (profile?.onboardingComplete) {
    await backfillTargetHistoryIfNeeded(profile);
  }
  const snapshots = await localGetTargetHistory();
  const fallback = profile
    ? profileTargets(profile)
    : { dailyTargetCalories: 0, maintenanceCalories: 0 };
  return getTargetForDate(date, snapshots, fallback);
}

/**
 * One-time backfill: seed target history from the user's first logged day
 * (meals, workouts, or weight), not from upgrade date.
 */
export async function backfillTargetHistoryIfNeeded(
  profile: UserProfile,
): Promise<TargetSnapshot[]> {
  if (!profile.onboardingComplete) {
    return localGetTargetHistory();
  }

  const alreadyDone = await AsyncStorage.getItem(
    LOCAL_KEYS.targetHistoryBackfillV1,
  );
  if (alreadyDone) {
    return localGetTargetHistory();
  }

  const [logs, workouts, weights] = await Promise.all([
    localGetAllLogs(),
    localGetAllWorkouts(),
    localGetWeightEntries(),
  ]);

  const today = formatDateKey();
  const activityDates = collectActivityDates(
    Object.keys(logs),
    Object.keys(workouts),
    weights.map(entry => entry.date),
  );
  const startDate = inferTargetHistoryStartDate(activityDates, today);

  const { snapshots } = await updateTargetHistory(existing => {
    const result = backfillTargetHistorySnapshots(
      existing,
      profileTargets(profile),
      startDate,
      today,
    );
    return result.changed ? result.snapshots : existing;
  });

  await AsyncStorage.setItem(LOCAL_KEYS.targetHistoryBackfillV1, '1');
  return snapshots;
}

export async function ensureTargetHistorySeeded(
  profile: UserProfile,
): Promise<TargetSnapshot[]> {
  const snapshots = await backfillTargetHistoryIfNeeded(profile);
  if (snapshots.length) {
    return snapshots;
  }

  const seeded = await updateTargetHistory(existing =>
    existing.length
      ? existing
      : seedInitialTargetSnapshot(formatDateKey(), profileTargets(profile)),
  );
  return seeded.snapshots;
}

export async function recordTargetSnapshotIfChanged(
  profile: UserProfile,
  effectiveFrom: string = formatDateKey(),
): Promise<void> {
  const next = profileTargets(profile);

  await updateTargetHistory(existing => {
    if (!existing.length) {
      return seedInitialTargetSnapshot(effectiveFrom, next);
    }

    const updated = appendTargetSnapshot(existing, effectiveFrom, next, next);
    const sortedExisting = sortTargetSnapshots(existing);
    const sortedUpdated = sortTargetSnapshots(updated);

    if (
      sortedExisting.length === sortedUpdated.length &&
      sortedExisting.every(
        (snap, index) =>
          snap.effectiveFrom === sortedUpdated[index]?.effectiveFrom &&
          snap.dailyTargetCalories ===
            sortedUpdated[index]?.dailyTargetCalories &&
          snap.maintenanceCalories ===
            sortedUpdated[index]?.maintenanceCalories,
      )
    ) {
      return existing;
    }

    return updated;
  });
}

/**
 * Atomically read-modify-write local target history, then queue the latest
 * full history for upload when it changed. Return `existing` to skip.
 */
async function updateTargetHistory(
  updater: (existing: TargetSnapshot[]) => TargetSnapshot[],
): Promise<{ snapshots: TargetSnapshot[]; changed: boolean }> {
  let changed = false;
  const snapshots = await localUpdateTargetHistory(existing => {
    const next = updater(existing);
    changed = next !== existing;
    return next;
  });
  if (changed) {
    // Queue the latest local state (not `snapshots`) so that when two updates
    // race, whichever enqueues last still uploads the newest history.
    await enqueueSync({
      entity: 'targetHistory',
      operation: 'update',
      payload: { snapshots: await localGetTargetHistory() },
      coalesceKey: 'targetHistory',
    });
  }
  return { snapshots, changed };
}

export async function replaceTargetHistoryFromRemote(
  snapshots: TargetSnapshot[],
): Promise<void> {
  await localSaveTargetHistory(snapshots);
}
