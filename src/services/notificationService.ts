import { AppState, Linking, Platform, type AppStateStatus } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import notifee, {
  AlarmType,
  AndroidImportance,
  AndroidNotificationSetting,
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
import { notificationIdForWorkout } from '../utils/workoutReminders';
import { getProfile, getTodayLog } from './storage';

const CHANNEL_ID = 'calo-daily-reminder';
const TEST_NOTIFICATION_ID = 'test-notification';
/** UTC offset (minutes) the current reminder triggers were computed in. */
const REMINDER_TZ_OFFSET_KEY = '@caltrack/reminder-tz-offset';

export interface ReminderSyncResult {
  /** False when reminders are enabled but the OS blocks notifications. */
  granted: boolean;
}

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
  }
}

export async function requestNotificationPermission(): Promise<boolean> {
  const settings = await notifee.requestPermission();
  return (
    settings.authorizationStatus === AuthorizationStatus.AUTHORIZED ||
    settings.authorizationStatus === AuthorizationStatus.PROVISIONAL
  );
}

function isGranted(status: AuthorizationStatus): boolean {
  return (
    status === AuthorizationStatus.AUTHORIZED ||
    status === AuthorizationStatus.PROVISIONAL
  );
}

/** Current permission without prompting the user. */
export async function hasNotificationPermission(): Promise<boolean> {
  const settings = await notifee.getNotificationSettings();
  return isGranted(settings.authorizationStatus);
}

/** Opens the OS notification settings for this app. */
export async function openNotificationSettings(): Promise<void> {
  try {
    if (Platform.OS === 'android') {
      await notifee.openNotificationSettings();
      return;
    }
    await Linking.openSettings();
  } catch {
    await Linking.openSettings().catch(() => undefined);
  }
}

/**
 * Next local wall-clock occurrence of `minutesFromMidnight`. With
 * `skipToday`, today's occurrence is skipped (meal already logged) and the
 * first trigger is tomorrow. Uses local date math so DST days are handled.
 */
export function getNextTriggerDate(
  minutesFromMidnight: number,
  options: { skipToday?: boolean; now?: Date } = {},
): Date {
  const now = options.now ?? new Date();
  const trigger = new Date(now.getTime());
  trigger.setHours(Math.floor(minutesFromMidnight / 60));
  trigger.setMinutes(minutesFromMidnight % 60);
  trigger.setSeconds(0);
  trigger.setMilliseconds(0);

  if (options.skipToday || trigger.getTime() <= now.getTime()) {
    trigger.setDate(trigger.getDate() + 1);
  }

  return trigger;
}

/**
 * Exact + allow-while-idle when the OS lets us schedule exact alarms;
 * otherwise inexact allow-while-idle. Notifee silently drops exact triggers
 * when SCHEDULE_EXACT_ALARM is denied (Android 12+), so never assume exact.
 */
async function resolveAlarmType(): Promise<AlarmType> {
  if (Platform.OS !== 'android') {
    return AlarmType.SET_AND_ALLOW_WHILE_IDLE;
  }
  try {
    const settings = await notifee.getNotificationSettings();
    const alarm = settings.android?.alarm;
    if (
      alarm === AndroidNotificationSetting.ENABLED ||
      alarm === AndroidNotificationSetting.NOT_SUPPORTED
    ) {
      return AlarmType.SET_EXACT_AND_ALLOW_WHILE_IDLE;
    }
  } catch {
    // Fall through to inexact.
  }
  return AlarmType.SET_AND_ALLOW_WHILE_IDLE;
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

/** Cancel every scheduled reminder (meals + workout). Used on sign-out / delete. */
export async function cancelAllReminders(): Promise<void> {
  await Promise.all([
    cancelAllMealReminders(),
    cancelWorkoutReminder(),
    AsyncStorage.removeItem(REMINDER_TZ_OFFSET_KEY),
  ]);
}

export async function scheduleMealReminder(
  meal: MealReminderMeal,
  minutesFromMidnight: number,
  options: { skipToday?: boolean } = {},
): Promise<void> {
  await ensureChannel();
  const notificationId = notificationIdForMeal(meal);
  await notifee.cancelNotification(notificationId);

  const triggerDate = getNextTriggerDate(minutesFromMidnight, options);
  const notification = {
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
  };
  const buildTrigger = (alarmType: AlarmType): TimestampTrigger => ({
    type: TriggerType.TIMESTAMP,
    timestamp: triggerDate.getTime(),
    repeatFrequency: RepeatFrequency.DAILY,
    alarmManager: { type: alarmType },
  });

  const alarmType = await resolveAlarmType();
  try {
    await notifee.createTriggerNotification(
      notification,
      buildTrigger(alarmType),
    );
  } catch (error) {
    if (alarmType === AlarmType.SET_AND_ALLOW_WHILE_IDLE) {
      throw error;
    }
    // Exact alarm permission revoked between check and schedule.
    await notifee.createTriggerNotification(
      notification,
      buildTrigger(AlarmType.SET_AND_ALLOW_WHILE_IDLE),
    );
  }
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

export async function syncDailyReminder(
  profile: UserProfile,
  options: { promptForPermission?: boolean } = {},
): Promise<ReminderSyncResult> {
  const result = await syncMealReminders(profile, options);
  await cancelWorkoutReminder();
  return result;
}

async function syncMealReminders(
  profile: UserProfile,
  { promptForPermission = true }: { promptForPermission?: boolean },
): Promise<ReminderSyncResult> {
  const mealReminders = resolveMealReminders(profile);
  const hasAnyEnabled = (['breakfast', 'lunch', 'dinner'] as MealReminderMeal[]).some(
    meal => mealReminders[meal].enabled,
  );

  if (!hasAnyEnabled) {
    await cancelAllMealReminders();
    return { granted: true };
  }
  const granted = promptForPermission
    ? await requestNotificationPermission()
    : await hasNotificationPermission();
  if (!granted) {
    return { granted: false };
  }

  const todayLog = await getTodayLog();
  const loggedMeals = new Set(todayLog.entries.map(entry => entry.mealType));

  const tasks: Promise<void>[] = [];

  for (const meal of ['breakfast', 'lunch', 'dinner'] as MealReminderMeal[]) {
    const setting = mealReminders[meal];
    if (!setting.enabled) {
      tasks.push(cancelMealReminder(meal));
      continue;
    }

    // Already logged today: skip today's reminder only. Cancelling would
    // kill the repeating DAILY trigger for every future day too.
    tasks.push(
      scheduleMealReminder(meal, setting.timeMinutes, {
        skipToday: loggedMeals.has(meal),
      }),
    );
  }

  await Promise.all(tasks);
  await AsyncStorage.setItem(
    REMINDER_TZ_OFFSET_KEY,
    String(new Date().getTimezoneOffset()),
  );
  return { granted: true };
}

/**
 * Triggers are absolute epochs repeating every 24h, so a timezone or DST
 * change shifts them off the user's wall-clock time. Re-sync (without
 * prompting) when the UTC offset differs from the one we scheduled in.
 */
export async function rescheduleRemindersIfTimezoneChanged(): Promise<void> {
  const stored = await AsyncStorage.getItem(REMINDER_TZ_OFFSET_KEY);
  if (stored === null) {
    // Nothing scheduled (or signed out) — nothing to fix.
    return;
  }
  if (Number(stored) === new Date().getTimezoneOffset()) {
    return;
  }
  const profile = await getProfile();
  if (!profile?.onboardingComplete) {
    return;
  }
  await syncDailyReminder(profile, { promptForPermission: false });
}

/** Re-checks reminder timing whenever the app returns to the foreground. */
export function startReminderTimezoneWatcher(): () => void {
  const check = () => {
    void rescheduleRemindersIfTimezoneChanged().catch(() => undefined);
  };
  check();
  const sub = AppState.addEventListener('change', (state: AppStateStatus) => {
    if (state === 'active') {
      check();
    }
  });
  return () => sub.remove();
}

export async function onMealsLogged(profile: UserProfile): Promise<void> {
  await syncDailyReminder(profile);
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
