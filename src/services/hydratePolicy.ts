export type HydrateLocalPolicy =
  | 'skip'
  | 'reset-and-pull'
  | 'claim-local'
  | 'pull';

/**
 * Decide what to do with on-device data when a signed-in user hydrates.
 *
 * Guest / pre-account logs have no hydrated user id. Those must be claimed
 * and kept — never wiped — so "log first, sign in later" actually works.
 */
export function resolveHydrateLocalPolicy(
  hydratedFor: string | null,
  userId: string,
  empty: boolean,
): HydrateLocalPolicy {
  if (hydratedFor === userId && !empty) {
    return 'skip';
  }
  if (hydratedFor && hydratedFor !== userId) {
    return 'reset-and-pull';
  }
  if (!empty) {
    return 'claim-local';
  }
  return 'pull';
}
