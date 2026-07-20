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

  const [logs, workouts, weights, existing] = await Promise.all([
    localGetAllLogs(),
    localGetAllWorkouts(),
    localGetWeightEntries(),
    localGetTargetHistory(),
  ]);

  const today = formatDateKey();
  const activityDates = collectActivityDates(
    Object.keys(logs),
    Object.keys(workouts),
    weights.map(entry => entry.date),
  );
  const startDate = inferTargetHistoryStartDate(activityDates, today);
  const result = backfillTargetHistorySnapshots(
    existing,
    profileTargets(profile),
    startDate,
    today,
  );

  if (result.changed) {
    await persistTargetHistory(result.snapshots);
    await AsyncStorage.setItem(LOCAL_KEYS.targetHistoryBackfillV1, '1');
    return result.snapshots;
  }

  await AsyncStorage.setItem(LOCAL_KEYS.targetHistoryBackfillV1, '1');
  return existing;
}

export async function ensureTargetHistorySeeded(
  profile: UserProfile,
): Promise<TargetSnapshot[]> {
  const snapshots = await backfillTargetHistoryIfNeeded(profile);
  if (snapshots.length) {
    return snapshots;
  }

  const seeded = seedInitialTargetSnapshot(
    formatDateKey(),
    profileTargets(profile),
  );
  await persistTargetHistory(seeded);
  return seeded;
}

export async function recordTargetSnapshotIfChanged(
  profile: UserProfile,
  effectiveFrom: string = formatDateKey(),
): Promise<void> {
  const existing = await localGetTargetHistory();
  const next = profileTargets(profile);

  if (!existing.length) {
    await persistTargetHistory(seedInitialTargetSnapshot(effectiveFrom, next));
    return;
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
        snap.maintenanceCalories === sortedUpdated[index]?.maintenanceCalories,
    )
  ) {
    return;
  }

  await persistTargetHistory(updated);
}

async function persistTargetHistory(snapshots: TargetSnapshot[]): Promise<void> {
  await localSaveTargetHistory(snapshots);
  await enqueueSync({
    entity: 'targetHistory',
    operation: 'update',
    payload: { snapshots },
    coalesceKey: 'targetHistory',
  });
}

export async function replaceTargetHistoryFromRemote(
  snapshots: TargetSnapshot[],
): Promise<void> {
  await localSaveTargetHistory(snapshots);
}
