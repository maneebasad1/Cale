export type FoodRegion =
  | 'chinese'
  | 'japanese'
  | 'korean'
  | 'indian'
  | 'thai'
  | 'vietnamese'
  | 'filipino'
  | 'middle_eastern'
  | 'general';

export type FoodSource = 'local' | 'usda' | 'user';

export interface FoodItem {
  id: string;
  name: string;
  calories: number;
  servingLabel: string;
  region: FoodRegion;
  source: FoodSource;
  sourceRef?: string;
}

export const FOOD_REGION_LABELS: Record<FoodRegion, string> = {
  chinese: 'Chinese',
  japanese: 'Japanese',
  korean: 'Korean',
  indian: 'Indian',
  thai: 'Thai',
  vietnamese: 'Vietnamese',
  filipino: 'Filipino',
  middle_eastern: 'Middle Eastern',
  general: 'General',
};

export type EntryMode = 'food' | 'custom' | 'describe';

export interface EntryInput {
  mealType: import('./index').MealType;
  calories: number;
  entryMode: EntryMode;
  foodName?: string;
  foodId?: string;
  servingLabel?: string;
}
