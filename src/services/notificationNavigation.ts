import notifee, { EventType, type EventDetail } from '@notifee/react-native';
import {
  flushPendingNotificationNavigation,
  queueNotificationNavigation,
} from '../navigation/navigationRef';

let appReadyForNotificationNavigation = false;

export function setNotificationNavigationReady(ready: boolean): void {
  appReadyForNotificationNavigation = ready;
  if (ready) {
    flushPendingNotificationNavigation(true);
  }
}

export async function handleNotificationPressEvent(
  detail: EventDetail,
): Promise<void> {
  if (detail.notification) {
    queueNotificationNavigation(detail.notification);
    flushPendingNotificationNavigation(appReadyForNotificationNavigation);
  }
}

export async function processInitialNotification(): Promise<void> {
  const initial = await notifee.getInitialNotification();
  if (initial?.notification) {
    queueNotificationNavigation(initial.notification);
  }
}

export function registerNotificationNavigationHandlers(): () => void {
  return notifee.onForegroundEvent(({ type, detail }) => {
    if (type === EventType.PRESS) {
      void handleNotificationPressEvent(detail);
      flushPendingNotificationNavigation(true);
    }
  });
}

export function registerBackgroundNotificationHandler(): void {
  notifee.onBackgroundEvent(async ({ type, detail }) => {
    if (type === EventType.PRESS) {
      await handleNotificationPressEvent(detail);
    }
  });
}
