import { Platform } from 'react-native';
import notifee, {
  AndroidImportance,
  AuthorizationStatus,
  RepeatFrequency,
  TimestampTrigger,
  TriggerType,
} from '@notifee/react-native';
import type { UserProfile } from '../types';
import { getTodayLog } from './storage';

const CHANNEL_ID = 'calo-daily-reminder';
const REMINDER_NOTIFICATION_ID = 'daily-log-reminder';

export const DEFAULT_REMINDER_MINUTES = 20 * 60;

export function minutesToLabel(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHour = hours % 12 === 0 ? 12 : hours % 12;
  return `${displayHour}:${String(mins).padStart(2, '0')} ${period}`;
}

export function parseTimeLabel(label: string): number | null {
  const match = label.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) {
    return null;
  }

  let hours = parseInt(match[1], 10);
  const mins = parseInt(match[2], 10);
  const period = match[3].toUpperCase();

  if (period === 'PM' && hours !== 12) {
    hours += 12;
  }
  if (period === 'AM' && hours === 12) {
    hours = 0;
  }

  return hours * 60 + mins;
}

async function ensureChannel(): Promise<void> {
  if (Platform.OS === 'android') {
    await notifee.createChannel({
      id: CHANNEL_ID,
      name: 'Daily reminders',
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

export async function scheduleDailyReminder(
  minutesFromMidnight: number = DEFAULT_REMINDER_MINUTES,
): Promise<void> {
  await ensureChannel();
  await notifee.cancelNotification(REMINDER_NOTIFICATION_ID);

  const triggerDate = getNextTriggerDate(minutesFromMidnight);
  const trigger: TimestampTrigger = {
    type: TriggerType.TIMESTAMP,
    timestamp: triggerDate.getTime(),
    repeatFrequency: RepeatFrequency.DAILY,
  };

  await notifee.createTriggerNotification(
    {
      id: REMINDER_NOTIFICATION_ID,
      title: 'Calo',
      body: "Don't forget to log today's meals!",
      android: {
        channelId: CHANNEL_ID,
        pressAction: { id: 'default' },
      },
    },
    trigger,
  );
}

export async function cancelDailyReminder(): Promise<void> {
  await notifee.cancelNotification(REMINDER_NOTIFICATION_ID);
}

export async function syncDailyReminder(profile: UserProfile): Promise<void> {
  if (!profile.reminderEnabled) {
    await cancelDailyReminder();
    return;
  }

  const granted = await requestNotificationPermission();
  if (!granted) {
    return;
  }

  const todayLog = await getTodayLog();
  if (todayLog.entries.length > 0) {
    await cancelDailyReminder();
    return;
  }

  await scheduleDailyReminder(
    profile.reminderTimeMinutes ?? DEFAULT_REMINDER_MINUTES,
  );
}

export async function onMealsLogged(profile: UserProfile): Promise<void> {
  if (profile.reminderEnabled) {
    await cancelDailyReminder();
  }
}
