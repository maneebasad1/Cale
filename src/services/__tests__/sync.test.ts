import type { UserProfile } from '../../types';
import { LOCAL_KEYS } from '../localKeys';
import {
  localGetProfile,
  localSaveProfile,
  localSetHydratedUserId,
  resetLocalEntityStore,
} from '../localStore';
import * as db from '../supabaseData';
import {
  drainSyncQueue,
  flushSyncQueue,
  hydrateFromRemote,
} from '../sync';
import {
  GUEST_QUEUE_OWNER,
  SYNC_MAX_RETRIES,
  enqueueSync,
  getSyncQueue,
  mutateSyncQueue,
} from '../syncQueue';

jest.mock('@react-native-async-storage/async-storage', () => {
  const store = new Map<string, string>();
  const tick = () => new Promise<void>(resolve => setTimeout(resolve, 0));
  return {
    __store: store,
    getItem: jest.fn(async (key: string) => {
      await tick();
      return store.has(key) ? store.get(key) : null;
    }),
    setItem: jest.fn(async (key: string, value: string) => {
      await tick();
      store.set(key, value);
    }),
    removeItem: jest.fn(async (key: string) => {
      await tick();
      store.delete(key);
    }),
  };
});

jest.mock('@react-native-community/netinfo', () => ({
  fetch: jest.fn(async () => ({ isConnected: true })),
  addEventListener: jest.fn(() => () => undefined),
}));

const mockCachedUser: { current: { id: string } | null } = { current: null };
jest.mock('../authCache', () => ({
  getCachedAuthUser: jest.fn(async () => mockCachedUser.current),
}));

jest.mock('../supabaseData', () => ({
  tryGetSessionUserId: jest.fn(async () => 'user-a'),
  fetchProfile: jest.fn(async () => null),
  fetchAllLogs: jest.fn(async () => ({})),
  fetchCustomFoods: jest.fn(async () => []),
  fetchWeightEntries: jest.fn(async () => []),
  fetchTargetHistory: jest.fn(async () => []),
  fetchAllWorkouts: jest.fn(async () => ({})),
  upsertProfile: jest.fn(async () => undefined),
  upsertCalorieEntry: jest.fn(async () => undefined),
  removeEntry: jest.fn(async () => undefined),
  upsertCustomFood: jest.fn(async () => undefined),
  deleteCustomFoodRow: jest.fn(async () => undefined),
  upsertWeightEntryRemote: jest.fn(async () => undefined),
  deleteWeightEntryRow: jest.fn(async () => undefined),
  replaceTargetHistoryRemote: jest.fn(async () => undefined),
  upsertWorkoutEntry: jest.fn(async () => undefined),
  deleteWorkoutEntryRow: jest.fn(async () => undefined),
}));

const mockDb = db as jest.Mocked<typeof db>;
const AsyncStorageStore = (
  jest.requireMock('@react-native-async-storage/async-storage') as {
    __store: Map<string, string>;
  }
).__store;

function enqueueEntry(id: string, ownerId?: string) {
  return enqueueSync({
    entity: 'calorieEntry',
    operation: 'create',
    payload: { date: '2026-01-01', entry: { id } },
    coalesceKey: id,
    ownerId,
  });
}

/** Let fire-and-forget drains kicked by enqueueSync settle. */
async function settle() {
  for (let i = 0; i < 5; i += 1) {
    await drainSyncQueue();
    await new Promise<void>(resolve => setTimeout(resolve, 5));
  }
}

describe('sync worker', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    mockCachedUser.current = { id: 'user-a' };
    await resetLocalEntityStore();
    AsyncStorageStore.clear();
  });

  it('does not mark the user hydrated when the pull fails', async () => {
    mockDb.fetchAllLogs.mockRejectedValueOnce(new Error('Network request failed'));
    expect(await hydrateFromRemote()).toBe('failed');
    expect(AsyncStorageStore.get(LOCAL_KEYS.hydratedUserId)).toBeUndefined();
  });

  it('shares one in-flight hydration between callers', async () => {
    const [a, b] = await Promise.all([hydrateFromRemote(), hydrateFromRemote()]);
    expect(a).toBe('hydrated');
    expect(b).toBe('hydrated');
    expect(mockDb.fetchProfile).toHaveBeenCalledTimes(1);
  });

  it('never uploads before the user is hydrated on this device', async () => {
    mockDb.fetchAllLogs.mockRejectedValue(new Error('Network request failed'));
    await enqueueEntry('a');
    await settle();
    expect(mockDb.upsertCalorieEntry).not.toHaveBeenCalled();
    expect(await getSyncQueue()).toHaveLength(1);
    mockDb.fetchAllLogs.mockReset();
    mockDb.fetchAllLogs.mockResolvedValue({});
  });

  it('uploads each item once even when many drains are requested', async () => {
    await localSetHydratedUserId('user-a');
    await Promise.all(['a', 'b', 'c', 'd', 'e'].map(id => enqueueEntry(id)));
    await Promise.all([drainSyncQueue(), drainSyncQueue(), drainSyncQueue()]);
    await settle();
    expect(mockDb.upsertCalorieEntry).toHaveBeenCalledTimes(5);
    expect(await getSyncQueue()).toHaveLength(0);
  });

  it('does not count network failures toward the retry cap', async () => {
    await localSetHydratedUserId('user-a');
    mockDb.upsertCalorieEntry.mockRejectedValue(
      new TypeError('Network request failed'),
    );
    await enqueueEntry('a');
    await settle();
    const [item] = await getSyncQueue();
    expect(item.retryCount).toBe(0);
    expect(item.transientFailures).toBeGreaterThan(0);
    mockDb.upsertCalorieEntry.mockReset();
    mockDb.upsertCalorieEntry.mockResolvedValue(undefined);
  });

  it('discards items queued by another account', async () => {
    await localSetHydratedUserId('user-a');
    await enqueueEntry('mine');
    await enqueueEntry('theirs', 'user-b');
    await settle();
    expect(mockDb.upsertCalorieEntry).toHaveBeenCalledTimes(1);
    expect(await getSyncQueue()).toHaveLength(0);
  });

  it('claiming guest data into an existing account keeps the remote profile', async () => {
    const guestProfile = { onboardingComplete: true, age: 20 } as UserProfile;
    const remoteProfile = { onboardingComplete: true, age: 40 } as UserProfile;
    mockCachedUser.current = null;
    await localSaveProfile(guestProfile);
    await enqueueSync({
      entity: 'profile',
      operation: 'update',
      payload: { profile: guestProfile },
      coalesceKey: 'profile',
    });
    await enqueueEntry('guest-meal');
    expect((await getSyncQueue()).every(i => i.ownerId === GUEST_QUEUE_OWNER)).toBe(
      true,
    );

    mockCachedUser.current = { id: 'user-a' };
    mockDb.fetchProfile.mockResolvedValueOnce(remoteProfile);
    expect(await hydrateFromRemote()).toBe('hydrated');
    expect(await localGetProfile()).toEqual(remoteProfile);
    await settle();
    expect(mockDb.upsertProfile).not.toHaveBeenCalled();
    expect(mockDb.upsertCalorieEntry).toHaveBeenCalledTimes(1);
  });

  it('flushSyncQueue retries parked items and reports what is left', async () => {
    await localSetHydratedUserId('user-a');
    mockDb.upsertCalorieEntry.mockRejectedValueOnce({ message: 'boom', code: '23502' });
    await enqueueEntry('a');
    await settle();
    await mutateSyncQueue(queue =>
      queue.map(item => ({ ...item, retryCount: SYNC_MAX_RETRIES })),
    );
    expect(await flushSyncQueue(2_000)).toBe(0);
    expect(mockDb.upsertCalorieEntry).toHaveBeenCalledTimes(2);
  });
});
