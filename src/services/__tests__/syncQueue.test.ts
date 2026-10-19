import {
  GUEST_QUEUE_OWNER,
  clearSyncQueue,
  enqueueSync,
  getSyncQueue,
  removeSyncItems,
  updateSyncItem,
} from '../syncQueue';

jest.mock('@react-native-async-storage/async-storage', () => {
  const store = new Map<string, string>();
  const tick = () => new Promise<void>(resolve => setTimeout(resolve, 0));
  return {
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

const mockCachedUser: { current: { id: string } | null } = { current: null };
jest.mock('../authCache', () => ({
  getCachedAuthUser: jest.fn(async () => mockCachedUser.current),
}));

jest.mock('../sync', () => ({
  drainSyncQueue: jest.fn(async () => undefined),
  refreshSyncStatus: jest.fn(async () => undefined),
}));

describe('syncQueue', () => {
  beforeEach(async () => {
    mockCachedUser.current = null;
    await clearSyncQueue();
  });

  it('keeps every item when enqueued concurrently', async () => {
    await Promise.all(
      Array.from({ length: 10 }, (_, i) =>
        enqueueSync({
          entity: 'calorieEntry',
          operation: 'create',
          payload: { id: `e${i}` },
          coalesceKey: `e${i}`,
        }),
      ),
    );
    expect(await getSyncQueue()).toHaveLength(10);
  });

  it('a delete enqueued during a remove is not lost', async () => {
    const create = await enqueueSync({
      entity: 'calorieEntry',
      operation: 'create',
      payload: { id: 'a' },
      coalesceKey: 'a',
    });
    await Promise.all([
      removeSyncItems([create.id]),
      enqueueSync({
        entity: 'calorieEntry',
        operation: 'delete',
        payload: { id: 'b' },
        coalesceKey: 'b',
      }),
      updateSyncItem('missing', { retryCount: 3 }),
    ]);
    const queue = await getSyncQueue();
    expect(queue.map(item => item.coalesceKey)).toEqual(['b']);
  });

  it('a delete supersedes a pending create for the same key', async () => {
    await enqueueSync({
      entity: 'calorieEntry',
      operation: 'create',
      payload: { id: 'a' },
      coalesceKey: 'a',
    });
    await enqueueSync({
      entity: 'calorieEntry',
      operation: 'delete',
      payload: { id: 'a' },
      coalesceKey: 'a',
    });
    const queue = await getSyncQueue();
    expect(queue.map(item => item.operation)).toEqual(['delete']);
  });

  it('tags items with the signed-in user or guest', async () => {
    const guestItem = await enqueueSync({
      entity: 'profile',
      operation: 'update',
      payload: {},
      coalesceKey: 'profile',
    });
    mockCachedUser.current = { id: 'user-a' };
    const userItem = await enqueueSync({
      entity: 'customFood',
      operation: 'create',
      payload: {},
      coalesceKey: 'f',
    });
    expect(guestItem.ownerId).toBe(GUEST_QUEUE_OWNER);
    expect(userItem.ownerId).toBe('user-a');
  });
});
