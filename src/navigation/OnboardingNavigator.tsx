import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { colors, fonts } from '../constants/theme';
import { ActivityScreen } from '../screens/onboarding/ActivityScreen';
import { BodyMetricsScreen } from '../screens/onboarding/BodyMetricsScreen';
import { GoalScreen } from '../screens/onboarding/GoalScreen';
import { PersonalInfoScreen } from '../screens/onboarding/PersonalInfoScreen';
import { SummaryScreen } from '../screens/onboarding/SummaryScreen';
import type { OnboardingStackParamList } from './types';

const Stack = createNativeStackNavigator<OnboardingStackParamList>();

export function OnboardingNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
        headerTitleStyle: { fontFamily: fonts.bodySemiBold, fontSize: 17 },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: colors.background },
      }}>
      <Stack.Screen
        name="BodyMetrics"
        component={BodyMetricsScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="PersonalInfo"
        component={PersonalInfoScreen}
        options={{ title: 'About you' }}
      />
      <Stack.Screen
        name="Activity"
        component={ActivityScreen}
        options={{ title: 'Activity' }}
      />
      <Stack.Screen
        name="Goal"
        component={GoalScreen}
        options={{ title: 'Your goal' }}
      />
      <Stack.Screen
        name="Summary"
        component={SummaryScreen}
        options={{ headerShown: false, gestureEnabled: false }}
      />
    </Stack.Navigator>
  );
}
