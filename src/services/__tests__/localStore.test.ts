import AsyncStorage from '@react-native-async-storage/async-storage';
import type { CalorieEntry } from '../../types';
import { LOCAL_KEYS } from '../localKeys';
import {
  getLocalStoreGeneration,
  localApplyRemoteSnapshot,
  localDeleteEntry,
  localGetAllLogs,
  localGetCustomFoods,
  localUpdateCustomFoods,
  localUpsertEntry,
  resetLocalEntityStore,
} from '../localStore';

jest.mock('@react-native-async-storage/async-storage', () => {
  // Every call yields so unsynchronized read-modify-writes really interleave.
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

jest.mock('../widgetSnapshot', () => ({ refreshHomeWidget: jest.fn() }));

const store = (AsyncStorage as unknown as { __store: Map<string, string> })
  .__store;

function entry(id: string): CalorieEntry {
  return {
    id,
    mealType: 'lunch',
    calories: 100,
    timestamp: `2026-01-01T00:00:0${id.length}.000Z`,
  } as CalorieEntry;
}

describe('localStore', () => {
  beforeEach(async () => {
    await resetLocalEntityStore();
    store.clear();
  });

  it('does not lose concurrent upserts to the same day', async () => {
    await Promise.all(
      ['a', 'b', 'c', 'd'].map(id => localUpsertEntry('2026-01-01', entry(id))),
    );
    const logs = await localGetAllLogs();
    expect(logs['2026-01-01'].entries.map(e => e.id).sort()).toEqual([
      'a',
      'b',
      'c',
      'd',
    ]);
    const onDisk = JSON.parse(store.get(LOCAL_KEYS.logs) as string);
    expect(onDisk['2026-01-01'].entries).toHaveLength(4);
  });

  it('a delete racing an upsert of another entry sticks', async () => {
    await localUpsertEntry('2026-01-01', entry('a'));
    await Promise.all([
      localDeleteEntry('2026-01-01', 'a'),
      localUpsertEntry('2026-01-01', entry('b')),
    ]);
    const logs = await localGetAllLogs();
    expect(logs['2026-01-01'].entries.map(e => e.id)).toEqual(['b']);
  });

  it('serializes custom food updates', async () => {
    await Promise.all(
      ['x', 'y', 'z'].map(id =>
        localUpdateCustomFoods(foods => [
          { id, name: id, calories: 1 } as never,
          ...foods,
        ]),
      ),
    );
    expect((await localGetCustomFoods()).map(f => f.id).sort()).toEqual([
      'x',
      'y',
      'z',
    ]);
  });

  it('backs up corrupt JSON instead of silently discarding it', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    // Fresh module registry => cold in-memory cache and a fresh storage mock.
    let fresh!: typeof import('../localStore');
    let freshStore!: Map<string, string>;
    jest.isolateModules(() => {
      fresh = require('../localStore');
      freshStore = require('@react-native-async-storage/async-storage').__store;
    });
    freshStore.set(LOCAL_KEYS.customFoods, '{not json');
    expect(await fresh.localGetCustomFoods()).toEqual([]);
    expect(freshStore.get(`${LOCAL_KEYS.customFoods}:corrupt`)).toBe(
      '{not json',
    );
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('drops a remote snapshot when the store was reset mid-hydration', async () => {
    const generation = getLocalStoreGeneration();
    await resetLocalEntityStore();
    const applied = await localApplyRemoteSnapshot(
      generation,
      'user-a',
      async current => ({ ...current, customFoods: [{ id: 'r' } as never] }),
    );
    expect(applied).toBe(false);
    expect(await localGetCustomFoods()).toEqual([]);
    expect(store.get(LOCAL_KEYS.hydratedUserId)).toBeUndefined();
  });

  it('applies a remote snapshot and records the hydrated user', async () => {
    const applied = await localApplyRemoteSnapshot(
      getLocalStoreGeneration(),
      'user-a',
      async current => ({ ...current, customFoods: [{ id: 'r' } as never] }),
    );
    expect(applied).toBe(true);
    expect((await localGetCustomFoods()).map(f => f.id)).toEqual(['r']);
    expect(store.get(LOCAL_KEYS.hydratedUserId)).toBe('user-a');
  });
});
