import {
  REVIEW_RETRY_INTERVAL_MS,
  canAttemptReviewPrompt,
} from '../reviewRetry';

describe('canAttemptReviewPrompt', () => {
  const now = Date.parse('2026-10-19T12:00:00.000Z');

  it('allows the first attempt', () => {
    expect(canAttemptReviewPrompt(null, now)).toBe(true);
  });

  it('blocks a retry within the interval', () => {
    const lastAttempt = new Date(now - 24 * 60 * 60 * 1000).toISOString();
    expect(canAttemptReviewPrompt(lastAttempt, now)).toBe(false);
  });

  it('allows a retry once the interval has passed', () => {
    const lastAttempt = new Date(now - REVIEW_RETRY_INTERVAL_MS).toISOString();
    expect(canAttemptReviewPrompt(lastAttempt, now)).toBe(true);
  });

  it('treats an unparseable timestamp as no attempt', () => {
    expect(canAttemptReviewPrompt('garbage', now)).toBe(true);
  });
});
