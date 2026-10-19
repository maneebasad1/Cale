/** Minimum gap between in-app review attempts that didn't complete. */
export const REVIEW_RETRY_INTERVAL_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * True when no review attempt was recorded, or the last one is older than
 * the retry interval. Unparseable timestamps count as "no attempt".
 */
export function canAttemptReviewPrompt(
  lastAttemptAt: string | null,
  now: number = Date.now(),
): boolean {
  if (!lastAttemptAt) {
    return true;
  }
  const last = Date.parse(lastAttemptAt);
  if (Number.isNaN(last)) {
    return true;
  }
  return now - last >= REVIEW_RETRY_INTERVAL_MS;
}
