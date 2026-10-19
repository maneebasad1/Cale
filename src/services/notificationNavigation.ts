import notifee, { EventType, type EventDetail } from '@notifee/react-native';
import {
  flushPendingNotificationNavigation,
  navigationRef,
  queueNotificationNavigation,
} from '../navigation/navigationRef';

let appReadyForNotificationNavigation = false;

/**
 * Only navigate once the app says it's ready (profile bootstrapped +
 * onboarding complete) AND the Main stack is actually mounted. Otherwise the
 * target stays pending and is flushed by setNotificationNavigationReady(true).
 */
function canNavigateToMain(): boolean {
  if (!appReadyForNotificationNavigation || !navigationRef.isReady()) {
    return false;
  }
  const routeNames = navigationRef.getRootState()?.routeNames ?? [];
  return routeNames.includes('Main');
}

export function setNotificationNavigationReady(ready: boolean): void {
  appReadyForNotificationNavigation = ready;
  if (ready) {
    flushPendingNotificationNavigation(canNavigateToMain());
  }
}

export async function handleNotificationPressEvent(
  detail: EventDetail,
): Promise<void> {
  if (detail.notification) {
    queueNotificationNavigation(detail.notification);
    flushPendingNotificationNavigation(canNavigateToMain());
  }
}

export async function processInitialNotification(): Promise<void> {
  const initial = await notifee.getInitialNotification();
  if (initial?.notification) {
    queueNotificationNavigation(initial.notification);
  }
}

export function registerNotificationNavigationHandlers(): () => void {
  const unsubscribeForeground = notifee.onForegroundEvent(({ type, detail }) => {
    if (type === EventType.PRESS) {
      // Respect the readiness gate — the target stays queued until Main mounts.
      void handleNotificationPressEvent(detail);
    }
  });
  // Main may mount after the readiness flag flips (Auth/Onboarding → Main);
  // flush any queued target once the navigator state actually includes it.
  const unsubscribeState = navigationRef.addListener('state', () => {
    if (canNavigateToMain()) {
      flushPendingNotificationNavigation(true);
    }
  });
  return () => {
    unsubscribeForeground();
    unsubscribeState();
  };
}

export function registerBackgroundNotificationHandler(): void {
  notifee.onBackgroundEvent(async ({ type, detail }) => {
    if (type === EventType.PRESS) {
      await handleNotificationPressEvent(detail);
    }
  });
}
