export type OnboardingStackParamList = {
  BodyMetrics: undefined;
  PersonalInfo: {
    weightKg: number;
    heightCm: number;
    weightUnit: import('../types').WeightUnit;
    heightUnit: import('../types').HeightUnit;
  };
  Activity: {
    weightKg: number;
    heightCm: number;
    age: number;
    gender: import('../types').Gender;
    weightUnit: import('../types').WeightUnit;
    heightUnit: import('../types').HeightUnit;
  };
  Goal: {
    weightKg: number;
    heightCm: number;
    age: number;
    gender: import('../types').Gender;
    activityLevel: import('../types').ActivityLevel;
    maintenanceCalories: number;
    weightUnit: import('../types').WeightUnit;
    heightUnit: import('../types').HeightUnit;
  };
  Summary: {
    weightKg: number;
    heightCm: number;
    age: number;
    gender: import('../types').Gender;
    activityLevel: import('../types').ActivityLevel;
    maintenanceCalories: number;
    goalType: import('../types').GoalType;
    goalWeightKg: number;
    calorieAdjustment: number;
    dailyTargetCalories: number;
    weightUnit: import('../types').WeightUnit;
    heightUnit: import('../types').HeightUnit;
  };
};

export type MainStackParamList = {
  Tabs: undefined;
  AddEntry: { date: string; entryId?: string };
  MyFoods: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  History: undefined;
  Settings: undefined;
};

export type HistoryStackParamList = {
  HistoryCalendar: undefined;
  DayDetail: { date: string };
};

export type RootStackParamList = {
  Onboarding: undefined;
  Main: undefined;
};
