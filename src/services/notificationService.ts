import { Platform } from 'react-native';
import notifee, {
  AndroidImportance,
  AuthorizationStatus,
  RepeatFrequency,
  TimestampTrigger,
  TriggerType,
} from '@notifee/react-native';
import type { MealReminderMeal, MealReminders, UserProfile } from '../types';
import { MEAL_LABELS } from '../types';
import {
  mealReminderBody,
  notificationIdForMeal,
  resolveMealReminders,
} from '../utils/mealReminders';
import {
  notificationIdForWorkout,
  resolveWorkoutReminder,
  workoutReminderBody,
} from '../utils/workoutReminders';
import { formatDateKey } from '../utils/date';
import { getTodayLog } from './storage';
import { getWorkoutsForDate } from './workoutService';

const CHANNEL_ID = 'calo-daily-reminder';
const WORKOUT_CHANNEL_ID = 'calo-workout-reminder';
const TEST_NOTIFICATION_ID = 'test-notification';
const TEST_WORKOUT_NOTIFICATION_ID = 'test-workout-notification';

/** @deprecated Use DEFAULT_MEAL_REMINDERS.dinner.timeMinutes */
export const DEFAULT_REMINDER_MINUTES = 19 * 60;

export function minutesToLabel(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHour = hours % 12 === 0 ? 12 : hours % 12;
  return `${displayHour}:${String(mins).padStart(2, '0')} ${period}`;
}

export function dateFromMinutes(minutesFromMidnight: number): Date {
  const date = new Date();
  date.setHours(Math.floor(minutesFromMidnight / 60));
  date.setMinutes(minutesFromMidnight % 60);
  date.setSeconds(0);
  date.setMilliseconds(0);
  return date;
}

export function minutesFromDate(date: Date): number {
  return date.getHours() * 60 + date.getMinutes();
}

async function ensureChannel(): Promise<void> {
  if (Platform.OS === 'android') {
    await notifee.createChannel({
      id: CHANNEL_ID,
      name: 'Meal reminders',
      importance: AndroidImportance.DEFAULT,
    });
    await notifee.createChannel({
      id: WORKOUT_CHANNEL_ID,
      name: 'Workout reminders',
      importance: AndroidImportance.DEFAULT,
    });
  }
}

export async function requestNotificationPermission(): Promise<boolean> {
  const settings = await notifee.requestPermission();
  return (
    settings.authorizationStatus === AuthorizationStatus.AUTHORIZED ||
    settings.authorizationStatus === AuthorizationStatus.PROVISIONAL
  );
}

function getNextTriggerDate(minutesFromMidnight: number): Date {
  const now = new Date();
  const trigger = new Date();
  trigger.setHours(Math.floor(minutesFromMidnight / 60));
  trigger.setMinutes(minutesFromMidnight % 60);
  trigger.setSeconds(0);
  trigger.setMilliseconds(0);

  if (trigger.getTime() <= now.getTime()) {
    trigger.setDate(trigger.getDate() + 1);
  }

  return trigger;
}

export async function cancelMealReminder(meal: MealReminderMeal): Promise<void> {
  await notifee.cancelNotification(notificationIdForMeal(meal));
}

export async function cancelAllMealReminders(): Promise<void> {
  await Promise.all([
    cancelMealReminder('breakfast'),
    cancelMealReminder('lunch'),
    cancelMealReminder('dinner'),
  ]);
}

export async function cancelWorkoutReminder(): Promise<void> {
  await notifee.cancelNotification(notificationIdForWorkout());
}

export async function scheduleWorkoutReminder(
  minutesFromMidnight: number,
): Promise<void> {
  await ensureChannel();
  const notificationId = notificationIdForWorkout();
  await notifee.cancelNotification(notificationId);

  const triggerDate = getNextTriggerDate(minutesFromMidnight);
  const trigger: TimestampTrigger = {
    type: TriggerType.TIMESTAMP,
    timestamp: triggerDate.getTime(),
    repeatFrequency: RepeatFrequency.DAILY,
  };

  await notifee.createTriggerNotification(
    {
      id: notificationId,
      title: 'CALE',
      body: workoutReminderBody(),
      data: {
        target: 'AddWorkout',
      },
      android: {
        channelId: WORKOUT_CHANNEL_ID,
        pressAction: { id: 'default' },
      },
    },
    trigger,
  );
}

export async function scheduleMealReminder(
  meal: MealReminderMeal,
  minutesFromMidnight: number,
): Promise<void> {
  await ensureChannel();
  const notificationId = notificationIdForMeal(meal);
  await notifee.cancelNotification(notificationId);

  const triggerDate = getNextTriggerDate(minutesFromMidnight);
  const trigger: TimestampTrigger = {
    type: TriggerType.TIMESTAMP,
    timestamp: triggerDate.getTime(),
    repeatFrequency: RepeatFrequency.DAILY,
  };

  await notifee.createTriggerNotification(
    {
      id: notificationId,
      title: 'CALE',
      body: mealReminderBody(meal),
      data: {
        target: 'AddEntry',
        meal,
      },
      android: {
        channelId: CHANNEL_ID,
        pressAction: { id: 'default' },
      },
    },
    trigger,
  );
}

export async function sendTestNotification(
  meal: MealReminderMeal = 'breakfast',
): Promise<{ error: string | null }> {
  const granted = await requestNotificationPermission();
  if (!granted) {
    return {
      error: 'Notification permission was denied. Enable notifications in Settings.',
    };
  }

  await ensureChannel();
  await notifee.displayNotification({
    id: TEST_NOTIFICATION_ID,
    title: 'CALE',
    body: mealReminderBody(meal),
    data: {
      target: 'AddEntry',
      meal,
    },
    android: {
      channelId: CHANNEL_ID,
      pressAction: { id: 'default' },
    },
  });

  return { error: null };
}

export async function sendTestWorkoutNotification(): Promise<{
  error: string | null;
}> {
  const granted = await requestNotificationPermission();
  if (!granted) {
    return {
      error: 'Notification permission was denied. Enable notifications in Settings.',
    };
  }

  await ensureChannel();
  await notifee.displayNotification({
    id: TEST_WORKOUT_NOTIFICATION_ID,
    title: 'CALE',
    body: workoutReminderBody(),
    data: {
      target: 'AddWorkout',
    },
    android: {
      channelId: WORKOUT_CHANNEL_ID,
      pressAction: { id: 'default' },
    },
  });

  return { error: null };
}

async function syncWorkoutReminder(profile: UserProfile): Promise<void> {
  const setting = resolveWorkoutReminder(profile);

  if (!setting.enabled) {
    await cancelWorkoutReminder();
    return;
  }

  const granted = await requestNotificationPermission();
  if (!granted) {
    return;
  }

  const today = formatDateKey();
  const workouts = await getWorkoutsForDate(today);
  if (workouts.length > 0) {
    await cancelWorkoutReminder();
    return;
  }

  await scheduleWorkoutReminder(setting.timeMinutes);
}

export async function syncDailyReminder(profile: UserProfile): Promise<void> {
  await syncMealReminders(profile);
  await syncWorkoutReminder(profile);
}

async function syncMealReminders(profile: UserProfile): Promise<void> {
  const mealReminders = resolveMealReminders(profile);
  const hasAnyEnabled = (['breakfast', 'lunch', 'dinner'] as MealReminderMeal[]).some(
    meal => mealReminders[meal].enabled,
  );

  if (!hasAnyEnabled) {
    await cancelAllMealReminders();
    return;
  }
  const granted = await requestNotificationPermission();
  if (!granted) {
    return;
  }

  const todayLog = await getTodayLog();
  const loggedMeals = new Set(todayLog.entries.map(entry => entry.mealType));

  const tasks: Promise<void>[] = [];

  for (const meal of ['breakfast', 'lunch', 'dinner'] as MealReminderMeal[]) {
    const setting = mealReminders[meal];
    if (!setting.enabled || loggedMeals.has(meal)) {
      tasks.push(cancelMealReminder(meal));
      continue;
    }

    tasks.push(scheduleMealReminder(meal, setting.timeMinutes));
  }

  await Promise.all(tasks);
}

export async function onMealsLogged(profile: UserProfile): Promise<void> {
  await syncDailyReminder(profile);
}

export async function onWorkoutLogged(profile: UserProfile): Promise<void> {
  await syncDailyReminder(profile);
}

export function formatWorkoutReminderSummary(
  setting: ReturnType<typeof resolveWorkoutReminder>,
): string {
  if (!setting.enabled) {
    return 'Workout reminder off';
  }
  return `Workout at ${minutesToLabel(setting.timeMinutes)}`;
}

export function formatMealRemindersSummary(mealReminders: MealReminders): string {
  const enabled = (['breakfast', 'lunch', 'dinner'] as MealReminderMeal[]).filter(
    meal => mealReminders[meal].enabled,
  );

  if (enabled.length === 0) {
    return 'No meals selected';
  }

  return enabled
    .map(meal => `${MEAL_LABELS[meal]} at ${minutesToLabel(mealReminders[meal].timeMinutes)}`)
    .join('\n');
}
