import {
  REVIEW_MIN_LAUNCHES,
  REVIEW_MIN_LOGGED_DAYS,
  REVIEW_MIN_STREAK,
  isInAppReviewEligible,
} from '../reviewEligibility';

describe('isInAppReviewEligible', () => {
  const ready = {
    uniqueLoggedDays: REVIEW_MIN_LOGGED_DAYS,
    streak: 0,
    launchCount: REVIEW_MIN_LAUNCHES,
    hasPrompted: false,
  };

  it('does not prompt on first launch', () => {
    expect(
      isInAppReviewEligible({
        ...ready,
        launchCount: 1,
      }),
    ).toBe(false);
  });

  it('prompts after 3 logged days on a later launch', () => {
    expect(isInAppReviewEligible(ready)).toBe(true);
  });

  it('prompts after a 7-day streak even with fewer unique days', () => {
    expect(
      isInAppReviewEligible({
        uniqueLoggedDays: 1,
        streak: REVIEW_MIN_STREAK,
        launchCount: REVIEW_MIN_LAUNCHES,
        hasPrompted: false,
      }),
    ).toBe(true);
  });

  it('does not prompt again after it has already been requested', () => {
    expect(
      isInAppReviewEligible({
        ...ready,
        streak: REVIEW_MIN_STREAK,
        hasPrompted: true,
      }),
    ).toBe(false);
  });

  it('does not prompt with only one logged day and no streak', () => {
    expect(
      isInAppReviewEligible({
        uniqueLoggedDays: 1,
        streak: 1,
        launchCount: 5,
        hasPrompted: false,
      }),
    ).toBe(false);
  });
});
