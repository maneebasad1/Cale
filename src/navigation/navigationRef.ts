import {
  CommonActions,
  createNavigationContainerRef,
  type NavigatorScreenParams,
} from '@react-navigation/native';
import type { MainStackParamList, RootStackParamList } from '../navigation/types';
import type { MealReminderMeal, MealType } from '../types';
import { formatDateKey } from '../utils/date';
import { MEAL_REMINDER_MEALS } from '../types';

export const navigationRef = createNavigationContainerRef<RootStackParamList>();

export function navigateToAuth(intent: 'welcome' | 'save' = 'save'): void {
  if (!navigationRef.isReady()) {
    return;
  }
  navigationRef.navigate('Auth', { intent });
}

type NotificationTarget = {
  screen: 'AddEntry';
  mealType?: MealType;
};

let pendingTarget: NotificationTarget | null = null;

function mealFromReminderId(id: string): MealReminderMeal | null {
  for (const meal of MEAL_REMINDER_MEALS) {
    if (id === `meal-reminder-${meal}`) {
      return meal;
    }
  }
  return null;
}

export function parseNotificationTarget(notification: {
  id?: string;
  data?: Record<string, unknown>;
}): NotificationTarget | null {
  const target = notification.data?.target;
  if (target === 'AddEntry') {
    const meal = notification.data?.meal;
    if (
      typeof meal === 'string' &&
      MEAL_REMINDER_MEALS.includes(meal as MealReminderMeal)
    ) {
      return { screen: 'AddEntry', mealType: meal as MealType };
    }
    return { screen: 'AddEntry' };
  }

  const meal = notification.id ? mealFromReminderId(notification.id) : null;
  if (meal) {
    return { screen: 'AddEntry', mealType: meal };
  }

  return null;
}

export function queueNotificationNavigation(notification: {
  id?: string;
  data?: Record<string, unknown>;
}): void {
  const target = parseNotificationTarget(notification);
  if (target) {
    pendingTarget = target;
  }
}

export function flushPendingNotificationNavigation(
  canNavigate: boolean,
): void {
  if (!canNavigate || !pendingTarget || !navigationRef.isReady()) {
    return;
  }

  const today = formatDateKey();
  const target = pendingTarget;
  pendingTarget = null;

  navigationRef.dispatch(
    CommonActions.navigate({
      name: 'Main',
      params: {
        screen: 'AddEntry',
        params: {
          date: today,
          mealType: target.mealType,
        },
      } satisfies NavigatorScreenParams<MainStackParamList>,
    }),
  );
}
