/** AsyncStorage keys for local-first entity store + sync queue. */
export const LOCAL_KEYS = {
  profile: '@caltrack/profile',
  logs: '@caltrack/logs',
  customFoods: '@caltrack/custom-foods',
  weightEntries: '@caltrack/weight-entries',
  syncQueue: '@caltrack/sync-queue',
  /** Set after a successful hydrate-from-remote so we don't re-pull over local data. */
  hydratedUserId: '@caltrack/hydrated-user-id',
} as const;
