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
  AddEntry: {
    date: string;
    entryId?: string;
    /** Set when returning from AddCustomFood so the new food is selected. */
    prefillFood?: import('../types/food').FoodItem;
  };
  AddCustomFood:
    | {
        selectOnSave?: boolean;
        /** Required when selectOnSave — used to navigate back to AddEntry. */
        returnDate?: string;
        returnEntryId?: string;
      }
    | undefined;
  MyFoods: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  History: undefined;
  Profile: undefined;
};

export type ProfileStackParamList = {
  ProfileHome: undefined;
  ProfileBody: undefined;
  ProfileGoals: undefined;
  ProfileWeight: undefined;
  ProfileNotifications: undefined;
  ProfileAccount: undefined;
};

export type HistoryStackParamList = {
  HistoryCalendar: undefined;
  DayDetail: { date: string };
};

export type RootStackParamList = {
  Auth: undefined;
  Onboarding: undefined;
  Main: undefined;
};
