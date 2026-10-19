import type { MealType } from '../types';

/** Sensible default meal for the local time of day. */
export function getDefaultMealType(now: Date = new Date()): MealType {
  const hour = now.getHours();
  if (hour < 11) {
    return 'breakfast';
  }
  if (hour < 16) {
    return 'lunch';
  }
  if (hour < 21) {
    return 'dinner';
  }
  return 'snack';
}
