import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { colors, fonts } from '../constants/theme';
import { ProfileBodyScreen } from '../screens/profile/ProfileBodyScreen';
import { ProfileGoalsScreen } from '../screens/profile/ProfileGoalsScreen';
import { ProfileNotificationsScreen } from '../screens/profile/ProfileNotificationsScreen';
import { ProfileScreen } from '../screens/profile/ProfileScreen';
import { ProfileWeightScreen } from '../screens/profile/ProfileWeightScreen';
import type { ProfileStackParamList } from './types';

const ProfileStack = createNativeStackNavigator<ProfileStackParamList>();

export function ProfileNavigator() {
  return (
    <ProfileStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.porcelain },
        headerTintColor: colors.ink,
        headerTitleStyle: { fontFamily: fonts.bodySemiBold, fontSize: 17 },
        headerShadowVisible: false,
      }}>
      <ProfileStack.Screen
        name="ProfileHome"
        component={ProfileScreen}
        options={{ title: 'Profile' }}
      />
      <ProfileStack.Screen
        name="ProfileBody"
        component={ProfileBodyScreen}
        options={{ title: 'Settings' }}
      />
      <ProfileStack.Screen
        name="ProfileGoals"
        component={ProfileGoalsScreen}
        options={{ title: 'Goals' }}
      />
      <ProfileStack.Screen
        name="ProfileWeight"
        component={ProfileWeightScreen}
        options={{ title: 'Weight' }}
      />
      <ProfileStack.Screen
        name="ProfileNotifications"
        component={ProfileNotificationsScreen}
        options={{ title: 'Notifications' }}
      />
    </ProfileStack.Navigator>
  );
}
