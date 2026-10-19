/**
 * Minimal promise-chain mutex. Callers run strictly one at a time, in order.
 *
 * Not re-entrant: never call `run` on the same mutex from inside a task that
 * already holds it, or both will wait on each other forever.
 */
export interface AsyncMutex {
  run<T>(task: () => Promise<T> | T): Promise<T>;
}

export function createAsyncMutex(): AsyncMutex {
  let tail: Promise<unknown> = Promise.resolve();

  return {
    run<T>(task: () => Promise<T> | T): Promise<T> {
      const result = tail.then(() => task());
      // Keep the chain alive even when a task rejects.
      tail = result.catch(() => undefined);
      return result;
    },
  };
}
