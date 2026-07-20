import type { UserProfile } from '../types';
import { enabledMealReminderSummary, isAnyMealReminderEnabled } from './mealReminders';
import {
  enabledWorkoutReminderSummary,
  isWorkoutReminderEnabled,
} from './workoutReminders';

export function notificationsSummary(profile: UserProfile): string {
  const mealOn = isAnyMealReminderEnabled(profile);
  const workoutOn = isWorkoutReminderEnabled(profile);

  if (!mealOn && !workoutOn) {
    return 'Reminders off';
  }
  if (mealOn && workoutOn) {
    return `${enabledMealReminderSummary(profile)} · Workout on`;
  }
  if (workoutOn) {
    return enabledWorkoutReminderSummary(profile);
  }
  return enabledMealReminderSummary(profile);
}
