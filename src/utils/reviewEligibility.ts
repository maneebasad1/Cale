export const REVIEW_MIN_LOGGED_DAYS = 3;
export const REVIEW_MIN_STREAK = 7;
export const REVIEW_MIN_LAUNCHES = 2;

export function isInAppReviewEligible(input: {
  uniqueLoggedDays: number;
  streak: number;
  launchCount: number;
  hasPrompted: boolean;
}): boolean {
  if (input.hasPrompted) {
    return false;
  }
  if (input.launchCount < REVIEW_MIN_LAUNCHES) {
    return false;
  }
  return (
    input.uniqueLoggedDays >= REVIEW_MIN_LOGGED_DAYS ||
    input.streak >= REVIEW_MIN_STREAK
  );
}
