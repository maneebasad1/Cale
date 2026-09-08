import { resolveHydrateLocalPolicy } from '../hydratePolicy';

describe('resolveHydrateLocalPolicy', () => {
  const userId = 'user-a';

  it('skips when the same user already has local data', () => {
    expect(resolveHydrateLocalPolicy(userId, userId, false)).toBe('skip');
  });

  it('pulls again when the same user has an empty store', () => {
    expect(resolveHydrateLocalPolicy(userId, userId, true)).toBe('pull');
  });

  it('resets when local data belongs to a different account', () => {
    expect(resolveHydrateLocalPolicy('user-b', userId, false)).toBe(
      'reset-and-pull',
    );
  });

  it('claims guest local data instead of wiping it', () => {
    expect(resolveHydrateLocalPolicy(null, userId, false)).toBe('claim-local');
  });

  it('pulls remote when there is no local data', () => {
    expect(resolveHydrateLocalPolicy(null, userId, true)).toBe('pull');
  });
});
