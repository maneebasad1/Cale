import AsyncStorage from '@react-native-async-storage/async-storage';
import InAppReview from 'react-native-in-app-review';
import { getAllLogs } from './storage';
import { isInAppReviewEligible } from '../utils/reviewEligibility';
import { canAttemptReviewPrompt } from '../utils/reviewRetry';
import { countLoggedDays, getCurrentStreak } from '../utils/streak';
import { formatDateKey } from '../utils/date';

const FIRST_OPEN_KEY = '@caltrack/first-open-at';
const LAUNCH_COUNT_KEY = '@caltrack/launch-count';
const REVIEW_PROMPTED_KEY = '@caltrack/review-prompted-at';
/** Last attempt (success or failure) — throttles retries after failures. */
const REVIEW_LAST_ATTEMPT_KEY = '@caltrack/review-last-attempt-at';

let recordedLaunchThisProcess = false;
let requestInFlight = false;

export async function recordAppLaunch(): Promise<number> {
  if (!recordedLaunchThisProcess) {
    recordedLaunchThisProcess = true;
    const firstOpen = await AsyncStorage.getItem(FIRST_OPEN_KEY);
    if (!firstOpen) {
      await AsyncStorage.setItem(FIRST_OPEN_KEY, new Date().toISOString());
    }
    const raw = await AsyncStorage.getItem(LAUNCH_COUNT_KEY);
    const next = (raw ? parseInt(raw, 10) || 0 : 0) + 1;
    await AsyncStorage.setItem(LAUNCH_COUNT_KEY, String(next));
    return next;
  }

  const raw = await AsyncStorage.getItem(LAUNCH_COUNT_KEY);
  return raw ? parseInt(raw, 10) || 1 : 1;
}

export async function maybeRequestInAppReview(): Promise<boolean> {
  if (requestInFlight || !InAppReview.isAvailable()) {
    return false;
  }

  const [logs, launchRaw, promptedAt, lastAttemptAt] = await Promise.all([
    getAllLogs(),
    AsyncStorage.getItem(LAUNCH_COUNT_KEY),
    AsyncStorage.getItem(REVIEW_PROMPTED_KEY),
    AsyncStorage.getItem(REVIEW_LAST_ATTEMPT_KEY),
  ]);

  if (!canAttemptReviewPrompt(lastAttemptAt)) {
    return false;
  }

  const today = formatDateKey();
  const eligible = isInAppReviewEligible({
    uniqueLoggedDays: countLoggedDays(logs),
    streak: getCurrentStreak(logs, today),
    launchCount: launchRaw ? parseInt(launchRaw, 10) || 0 : 0,
    hasPrompted: Boolean(promptedAt),
  });

  if (!eligible) {
    return false;
  }

  requestInFlight = true;
  try {
    // Record the attempt up front so a failure (or crash) doesn't retry on
    // every Home focus — next try is allowed after REVIEW_RETRY_INTERVAL_MS.
    await AsyncStorage.setItem(
      REVIEW_LAST_ATTEMPT_KEY,
      new Date().toISOString(),
    );
    await InAppReview.RequestInAppReview();
    await AsyncStorage.setItem(REVIEW_PROMPTED_KEY, new Date().toISOString());
    return true;
  } catch {
    return false;
  } finally {
    requestInFlight = false;
  }
}
