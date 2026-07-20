import type { UserProfile, WorkoutReminderSetting } from '../types';
import { DEFAULT_WORKOUT_REMINDER } from '../types';
import { minutesToLabel } from '../services/notificationService';

export function resolveWorkoutReminder(
  profile: UserProfile,
): WorkoutReminderSetting {
  if (profile.workoutReminder) {
    return {
      ...DEFAULT_WORKOUT_REMINDER,
      ...profile.workoutReminder,
    };
  }
  return DEFAULT_WORKOUT_REMINDER;
}

export function isWorkoutReminderEnabled(profile: UserProfile): boolean {
  return resolveWorkoutReminder(profile).enabled;
}

export function enabledWorkoutReminderSummary(profile: UserProfile): string {
  const setting = resolveWorkoutReminder(profile);
  if (!setting.enabled) {
    return 'Workout reminder off';
  }
  return `Workout at ${minutesToLabel(setting.timeMinutes)}`;
}

export function workoutReminderBody(): string {
  return 'Time to log your workout calories!';
}

export function notificationIdForWorkout(): string {
  return 'workout-reminder';
}
