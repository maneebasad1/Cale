import type { UserProfile } from '../types';
import { enabledMealReminderSummary, isAnyMealReminderEnabled } from './mealReminders';

export function notificationsSummary(profile: UserProfile): string {
  if (!isAnyMealReminderEnabled(profile)) {
    return 'Reminders off';
  }
  return enabledMealReminderSummary(profile);
}
