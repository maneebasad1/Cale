const mockCreateTrigger = jest.fn();
const mockCancel = jest.fn();
const mockGetSettings = jest.fn();
const mockRequestPermission = jest.fn();
const mockStorage = new Map<string, string>();

jest.mock('@notifee/react-native', () => ({
  __esModule: true,
  default: {
    createChannel: jest.fn().mockResolvedValue('channel'),
    cancelNotification: (...args: unknown[]) => mockCancel(...args),
    createTriggerNotification: (...args: unknown[]) =>
      mockCreateTrigger(...args),
    getNotificationSettings: () => mockGetSettings(),
    requestPermission: () => mockRequestPermission(),
    openNotificationSettings: jest.fn(),
  },
  AlarmType: {
    SET: 0,
    SET_AND_ALLOW_WHILE_IDLE: 1,
    SET_EXACT: 2,
    SET_EXACT_AND_ALLOW_WHILE_IDLE: 3,
    SET_ALARM_CLOCK: 4,
  },
  AndroidImportance: { DEFAULT: 3 },
  AndroidNotificationSetting: { NOT_SUPPORTED: -1, DISABLED: 0, ENABLED: 1 },
  AuthorizationStatus: {
    NOT_DETERMINED: -1,
    DENIED: 0,
    AUTHORIZED: 1,
    PROVISIONAL: 2,
  },
  RepeatFrequency: { NONE: -1, HOURLY: 0, DAILY: 1, WEEKLY: 2 },
  TriggerType: { TIMESTAMP: 0, INTERVAL: 1 },
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(async (key: string) => mockStorage.get(key) ?? null),
    setItem: jest.fn(async (key: string, value: string) => {
      mockStorage.set(key, value);
    }),
    removeItem: jest.fn(async (key: string) => {
      mockStorage.delete(key);
    }),
  },
}));

const mockGetTodayLog = jest.fn();
const mockGetProfile = jest.fn();
jest.mock('../storage', () => ({
  getTodayLog: () => mockGetTodayLog(),
  getProfile: () => mockGetProfile(),
}));

import { Platform } from 'react-native';
import type { UserProfile } from '../../types';
import {
  cancelAllReminders,
  getNextTriggerDate,
  rescheduleRemindersIfTimezoneChanged,
  syncDailyReminder,
} from '../notificationService';

const AUTHORIZED = 1;
const DENIED = 0;
const ALARM_ENABLED = 1;
const ALARM_DISABLED = 0;
const SET_AND_ALLOW_WHILE_IDLE = 1;
const SET_EXACT_AND_ALLOW_WHILE_IDLE = 3;

function profileWith(
  meals: Partial<Record<'breakfast' | 'lunch' | 'dinner', boolean>>,
): UserProfile {
  return {
    onboardingComplete: true,
    mealReminders: {
      breakfast: { enabled: meals.breakfast ?? false, timeMinutes: 8 * 60 },
      lunch: { enabled: meals.lunch ?? false, timeMinutes: 13 * 60 },
      dinner: { enabled: meals.dinner ?? false, timeMinutes: 19 * 60 },
    },
  } as unknown as UserProfile;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockStorage.clear();
  Platform.OS = 'android';
  mockCreateTrigger.mockResolvedValue('id');
  mockCancel.mockResolvedValue(undefined);
  mockRequestPermission.mockResolvedValue({ authorizationStatus: AUTHORIZED });
  mockGetSettings.mockResolvedValue({
    authorizationStatus: AUTHORIZED,
    android: { alarm: ALARM_ENABLED },
  });
  mockGetTodayLog.mockResolvedValue({ date: '2026-10-19', entries: [] });
});

describe('getNextTriggerDate', () => {
  const now = new Date(2026, 9, 19, 12, 0, 0, 0);

  it('schedules later today when the time has not passed', () => {
    const trigger = getNextTriggerDate(19 * 60, { now });
    expect(trigger.getDate()).toBe(19);
    expect(trigger.getHours()).toBe(19);
  });

  it('rolls to tomorrow when the time has passed', () => {
    const trigger = getNextTriggerDate(8 * 60, { now });
    expect(trigger.getDate()).toBe(20);
    expect(trigger.getHours()).toBe(8);
  });

  it('skips today when requested even if the time is still ahead', () => {
    const trigger = getNextTriggerDate(19 * 60, { now, skipToday: true });
    expect(trigger.getDate()).toBe(20);
    expect(trigger.getHours()).toBe(19);
  });
});

describe('syncDailyReminder', () => {
  it('reports denied permission instead of silently succeeding', async () => {
    mockRequestPermission.mockResolvedValue({ authorizationStatus: DENIED });
    const result = await syncDailyReminder(profileWith({ dinner: true }));
    expect(result).toEqual({ granted: false });
    expect(mockCreateTrigger).not.toHaveBeenCalled();
  });

  it('reschedules a logged meal for tomorrow instead of cancelling it', async () => {
    mockGetTodayLog.mockResolvedValue({
      date: '2026-10-19',
      entries: [{ mealType: 'dinner' }],
    });
    const before = Date.now();
    await syncDailyReminder(profileWith({ dinner: true }));

    expect(mockCreateTrigger).toHaveBeenCalledTimes(1);
    const [notification, trigger] = mockCreateTrigger.mock.calls[0];
    expect(notification.id).toBe('meal-reminder-dinner');
    // First occurrence is never today.
    const first = new Date(trigger.timestamp);
    const tomorrow = new Date(before);
    tomorrow.setDate(tomorrow.getDate() + 1);
    expect(first.getDate()).toBe(tomorrow.getDate());
  });

  it('uses exact alarms when allowed', async () => {
    await syncDailyReminder(profileWith({ dinner: true }));
    const [, trigger] = mockCreateTrigger.mock.calls[0];
    expect(trigger.alarmManager).toEqual({
      type: SET_EXACT_AND_ALLOW_WHILE_IDLE,
    });
  });

  it('falls back to inexact alarms when exact alarms are denied', async () => {
    mockGetSettings.mockResolvedValue({
      authorizationStatus: AUTHORIZED,
      android: { alarm: ALARM_DISABLED },
    });
    await syncDailyReminder(profileWith({ dinner: true }));
    const [, trigger] = mockCreateTrigger.mock.calls[0];
    expect(trigger.alarmManager).toEqual({ type: SET_AND_ALLOW_WHILE_IDLE });
  });

  it('retries inexact when scheduling the exact alarm throws', async () => {
    mockCreateTrigger
      .mockRejectedValueOnce(new Error('exact alarm denied'))
      .mockResolvedValue('id');
    await syncDailyReminder(profileWith({ dinner: true }));
    expect(mockCreateTrigger).toHaveBeenCalledTimes(2);
    expect(mockCreateTrigger.mock.calls[1][1].alarmManager).toEqual({
      type: SET_AND_ALLOW_WHILE_IDLE,
    });
  });
});

describe('rescheduleRemindersIfTimezoneChanged', () => {
  it('does nothing when the offset is unchanged', async () => {
    await syncDailyReminder(profileWith({ dinner: true }));
    mockCreateTrigger.mockClear();
    await rescheduleRemindersIfTimezoneChanged();
    expect(mockCreateTrigger).not.toHaveBeenCalled();
  });

  it('re-syncs without prompting when the offset changed', async () => {
    mockStorage.set(
      '@caltrack/reminder-tz-offset',
      String(new Date().getTimezoneOffset() + 60),
    );
    mockGetProfile.mockResolvedValue(profileWith({ dinner: true }));
    await rescheduleRemindersIfTimezoneChanged();
    expect(mockRequestPermission).not.toHaveBeenCalled();
    expect(mockCreateTrigger).toHaveBeenCalledTimes(1);
  });

  it('does nothing after sign-out cleared reminders', async () => {
    await syncDailyReminder(profileWith({ dinner: true }));
    await cancelAllReminders();
    mockCreateTrigger.mockClear();
    mockGetProfile.mockResolvedValue(profileWith({ dinner: true }));
    await rescheduleRemindersIfTimezoneChanged();
    expect(mockCreateTrigger).not.toHaveBeenCalled();
    expect(mockCancel).toHaveBeenCalledWith('workout-reminder');
  });
});
