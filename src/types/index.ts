export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export type Gender = 'male' | 'female';

export type ActivityLevel =
  | 'sedentary'
  | 'lightly_active'
  | 'moderately_active'
  | 'very_active'
  | 'extra_active';

export type WeightUnit = 'kg' | 'lb';
export type HeightUnit = 'cm' | 'ft_in';

export type GoalType = 'lose' | 'gain' | 'maintain';

export interface CalorieEntry {
  id: string;
  mealType: MealType;
  calories: number;
  timestamp: string;
  entryMode?: 'food' | 'custom';
  foodName?: string;
  foodId?: string;
  servingLabel?: string;
}

export interface DailyLog {
  date: string;
  entries: CalorieEntry[];
}

export interface UserProfile {
  weightKg: number;
  heightCm: number;
  age: number;
  gender: Gender;
  activityLevel: ActivityLevel;
  maintenanceCalories: number;
  goalType: GoalType;
  goalWeightKg: number;
  calorieAdjustment: number;
  dailyTargetCalories: number;
  weightUnit: WeightUnit;
  heightUnit: HeightUnit;
  onboardingComplete: boolean;
  reminderEnabled?: boolean;
  /** Minutes from midnight, e.g. 20:00 = 1200 */
  reminderTimeMinutes?: number;
  lastWeightPromptDate?: string;
}

export const GOAL_OPTIONS: {
  value: GoalType;
  label: string;
  description: string;
  icon: 'trending-down' | 'trending-up' | 'checkmark-circle';
}[] = [
  {
    value: 'lose',
    label: 'Lose weight',
    description: 'Eat below maintenance to reach a lower goal weight',
    icon: 'trending-down',
  },
  {
    value: 'gain',
    label: 'Gain weight',
    description: 'Eat above maintenance to build toward a higher goal weight',
    icon: 'trending-up',
  },
  {
    value: 'maintain',
    label: 'Maintain weight',
    description: 'Eat at maintenance with no deficit or surplus',
    icon: 'checkmark-circle',
  },
];

export const MEAL_TYPES: MealType[] = [
  'breakfast',
  'lunch',
  'dinner',
  'snack',
];

export const MEAL_LABELS: Record<MealType, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snack',
};

export const ACTIVITY_LEVELS: {
  value: ActivityLevel;
  label: string;
  description: string;
}[] = [
  {
    value: 'sedentary',
    label: 'Sedentary',
    description: 'Little or no exercise',
  },
  {
    value: 'lightly_active',
    label: 'Lightly Active',
    description: 'Light exercise 1–3 days/week',
  },
  {
    value: 'moderately_active',
    label: 'Moderately Active',
    description: 'Moderate exercise 3–5 days/week',
  },
  {
    value: 'very_active',
    label: 'Very Active',
    description: 'Hard exercise 6–7 days/week',
  },
  {
    value: 'extra_active',
    label: 'Extra Active',
    description: 'Very hard exercise & physical job',
  },
];
