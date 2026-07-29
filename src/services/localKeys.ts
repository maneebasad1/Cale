/** AsyncStorage keys for local-first entity store + sync queue. */
export const LOCAL_KEYS = {
  profile: '@caltrack/profile',
  logs: '@caltrack/logs',
  customFoods: '@caltrack/custom-foods',
  weightEntries: '@caltrack/weight-entries',
  targetHistory: '@caltrack/target-history',
  workouts: '@caltrack/workouts',
  syncQueue: '@caltrack/sync-queue',
  /** Set after a successful hydrate-from-remote so we don't re-pull over local data. */
  hydratedUserId: '@caltrack/hydrated-user-id',
  /** One-time client backfill for target history start dates (v1). */
  targetHistoryBackfillV1: '@caltrack/target-history-backfill-v1',
  aiEstimateUsage: '@caltrack/ai-estimate-usage',
} as const;
