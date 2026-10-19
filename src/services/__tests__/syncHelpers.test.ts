import { createAsyncMutex } from '../../utils/asyncMutex';
import { NetworkTimeoutError } from '../../utils/networkTimeout';
import { isTransientSyncError } from '../../utils/syncErrors';

describe('createAsyncMutex', () => {
  it('runs tasks one at a time in order, even after a rejection', async () => {
    const mutex = createAsyncMutex();
    const events: string[] = [];
    const task = (name: string, fail = false) =>
      mutex.run(async () => {
        events.push(`start ${name}`);
        await new Promise<void>(resolve => setTimeout(resolve, 1));
        events.push(`end ${name}`);
        if (fail) {
          throw new Error(name);
        }
        return name;
      });

    const results = await Promise.allSettled([
      task('a'),
      task('b', true),
      task('c'),
    ]);
    expect(events).toEqual([
      'start a',
      'end a',
      'start b',
      'end b',
      'start c',
      'end c',
    ]);
    expect(results.map(r => r.status)).toEqual([
      'fulfilled',
      'rejected',
      'fulfilled',
    ]);
  });
});

describe('isTransientSyncError', () => {
  it.each([
    new NetworkTimeoutError(),
    new TypeError('Network request failed'),
    new Error('Not authenticated'),
    { message: 'JWT expired', code: 'PGRST301' },
    { message: 'TypeError: Network request failed', details: '', code: '' },
    { name: 'AbortError', message: 'Aborted' },
  ])('treats %p as transient', error => {
    expect(isTransientSyncError(error)).toBe(true);
  });

  it.each([
    { message: 'new row violates row-level security policy', code: '42501' },
    { message: 'null value in column "weight_kg"', code: '23502' },
    new Error('Unknown sync entity: foo'),
  ])('treats %p as permanent', error => {
    expect(isTransientSyncError(error)).toBe(false);
  });
});
