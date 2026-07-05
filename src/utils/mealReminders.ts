import type { MealReminderMeal, MealReminders, UserProfile } from '../types';
import {
  DEFAULT_MEAL_REMINDERS,
  MEAL_LABELS,
  MEAL_REMINDER_MEALS,
} from '../types';

export function resolveMealReminders(profile: UserProfile): MealReminders {
  if (profile.mealReminders) {
    return {
      breakfast: {
        ...DEFAULT_MEAL_REMINDERS.breakfast,
        ...profile.mealReminders.breakfast,
      },
      lunch: {
        ...DEFAULT_MEAL_REMINDERS.lunch,
        ...profile.mealReminders.lunch,
      },
      dinner: {
        ...DEFAULT_MEAL_REMINDERS.dinner,
        ...profile.mealReminders.dinner,
      },
    };
  }

  if (profile.reminderEnabled) {
    return {
      breakfast: { ...DEFAULT_MEAL_REMINDERS.breakfast, enabled: false },
      lunch: { ...DEFAULT_MEAL_REMINDERS.lunch, enabled: false },
      dinner: {
        enabled: true,
        timeMinutes:
          profile.reminderTimeMinutes ??
          DEFAULT_MEAL_REMINDERS.dinner.timeMinutes,
      },
    };
  }

  return DEFAULT_MEAL_REMINDERS;
}

export function isAnyMealReminderEnabled(profile: UserProfile): boolean {
  const reminders = resolveMealReminders(profile);
  return MEAL_REMINDER_MEALS.some(meal => reminders[meal].enabled);
}

export function enabledMealReminderSummary(profile: UserProfile): string {
  const reminders = resolveMealReminders(profile);
  const enabled = MEAL_REMINDER_MEALS.filter(meal => reminders[meal].enabled);

  if (enabled.length === 0) {
    return 'Meal reminders off';
  }

  return enabled.map(meal => MEAL_LABELS[meal]).join(', ');
}

export function mealReminderBody(meal: MealReminderMeal): string {
  return `Time to log your ${MEAL_LABELS[meal].toLowerCase()}!`;
}

export function notificationIdForMeal(meal: MealReminderMeal): string {
  return `meal-reminder-${meal}`;
}
