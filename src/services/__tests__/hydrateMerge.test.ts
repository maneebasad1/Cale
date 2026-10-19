import type { CalorieEntry, UserProfile } from '../../types';
import { mergeRemoteIntoLocal } from '../hydrateMerge';
import type { LocalEntitySnapshot } from '../localStore';
import type { SyncQueueItem } from '../syncQueue';

function empty(): LocalEntitySnapshot {
  return {
    profile: null,
    logs: {},
    customFoods: [],
    weightEntries: [],
    targetHistory: [],
    workouts: {},
  };
}

function entry(id: string, timestamp: string): CalorieEntry {
  return { id, mealType: 'lunch', calories: 100, timestamp } as CalorieEntry;
}

function queued(
  entity: SyncQueueItem['entity'],
  operation: SyncQueueItem['operation'],
  payload: Record<string, unknown> = {},
): SyncQueueItem {
  return {
    id: `${entity}-${operation}-${String(payload.id ?? '')}`,
    entity,
    operation,
    payload,
    createdAt: '2026-01-01T00:00:00.000Z',
    retryCount: 0,
  };
}

const localProfile = { onboardingComplete: true, weightKg: 60 } as UserProfile;
const remoteProfile = { onboardingComplete: true, weightKg: 90 } as UserProfile;

describe('mergeRemoteIntoLocal', () => {
  it('takes remote data when local is empty', () => {
    const remote = {
      ...empty(),
      profile: remoteProfile,
      logs: {
        '2026-01-01': {
          date: '2026-01-01',
          entries: [entry('r1', '2026-01-01T10:00:00Z')],
        },
      },
    };
    const merged = mergeRemoteIntoLocal(empty(), remote, []);
    expect(merged.profile).toBe(remoteProfile);
    expect(merged.logs['2026-01-01'].entries.map(e => e.id)).toEqual(['r1']);
  });

  it('unions logs by id, keeping local edits and new local entries', () => {
    const local = {
      ...empty(),
      logs: {
        '2026-01-01': {
          date: '2026-01-01',
          entries: [
            { ...entry('shared', '2026-01-01T09:00:00Z'), calories: 999 },
            entry('local', '2026-01-01T12:00:00Z'),
          ],
        },
      },
    };
    const remote = {
      ...empty(),
      logs: {
        '2026-01-01': {
          date: '2026-01-01',
          entries: [
            entry('shared', '2026-01-01T09:00:00Z'),
            entry('remote', '2026-01-01T11:00:00Z'),
          ],
        },
      },
    };
    const merged = mergeRemoteIntoLocal(local, remote, []);
    const entries = merged.logs['2026-01-01'].entries;
    expect(entries.map(e => e.id)).toEqual(['shared', 'remote', 'local']);
    expect(entries[0].calories).toBe(999);
  });

  it('does not resurrect remote items with a pending local delete', () => {
    const remote = {
      ...empty(),
      logs: {
        '2026-01-01': {
          date: '2026-01-01',
          entries: [entry('gone', '2026-01-01T09:00:00Z')],
        },
      },
      customFoods: [{ id: 'food-gone' } as never],
      weightEntries: [{ id: 'w-gone', date: '2026-01-01', weightKg: 70 }],
    };
    const merged = mergeRemoteIntoLocal(empty(), remote, [
      queued('calorieEntry', 'delete', { id: 'gone' }),
      queued('customFood', 'delete', { id: 'food-gone' }),
      queued('weightEntry', 'delete', { id: 'w-gone' }),
    ]);
    expect(merged.logs).toEqual({});
    expect(merged.customFoods).toEqual([]);
    expect(merged.weightEntries).toEqual([]);
  });

  it('keeps a locally queued profile over the remote one', () => {
    const merged = mergeRemoteIntoLocal(
      { ...empty(), profile: localProfile },
      { ...empty(), profile: remoteProfile },
      [queued('profile', 'update')],
    );
    expect(merged.profile).toBe(localProfile);
  });

  it('remote profile and target history win when claiming into an existing account', () => {
    const merged = mergeRemoteIntoLocal(
      {
        ...empty(),
        profile: localProfile,
        targetHistory: [
          {
            effectiveFrom: '2026-02-01',
            dailyTargetCalories: 1500,
            maintenanceCalories: 2000,
          },
        ],
        customFoods: [{ id: 'guest-food' } as never],
      },
      {
        ...empty(),
        profile: remoteProfile,
        targetHistory: [],
        customFoods: [{ id: 'remote-food' } as never],
      },
      [],
      { remoteWins: true },
    );
    expect(merged.profile).toBe(remoteProfile);
    expect(merged.targetHistory).toEqual([]);
    expect(merged.customFoods.map(f => f.id)).toEqual([
      'guest-food',
      'remote-food',
    ]);
  });

  it('prefers the local weight check-in for the same day', () => {
    const merged = mergeRemoteIntoLocal(
      {
        ...empty(),
        weightEntries: [{ id: 'local', date: '2026-01-02', weightKg: 71 }],
      },
      {
        ...empty(),
        weightEntries: [
          { id: 'remote', date: '2026-01-02', weightKg: 70 },
          { id: 'older', date: '2026-01-01', weightKg: 72 },
        ],
      },
      [],
    );
    expect(merged.weightEntries.map(w => w.id)).toEqual(['local', 'older']);
  });
});
