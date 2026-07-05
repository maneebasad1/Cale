import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { TabIcon } from '../components/Icon';
import { APP_NAME } from '../constants/branding';
import { colors } from '../constants/theme';
import { AddEntryScreen } from '../screens/entry/AddEntryScreen';
import { MyFoodsScreen } from '../screens/foods/MyFoodsScreen';
import { DayDetailScreen } from '../screens/history/DayDetailScreen';
import { HistoryScreen } from '../screens/history/HistoryScreen';
import { HomeScreen } from '../screens/home/HomeScreen';
import { SettingsScreen } from '../screens/settings/SettingsScreen';
import type {
  HistoryStackParamList,
  MainStackParamList,
  MainTabParamList,
} from './types';

const Tab = createBottomTabNavigator<MainTabParamList>();
const HistoryStack = createNativeStackNavigator<HistoryStackParamList>();
const MainStack = createNativeStackNavigator<MainStackParamList>();

function HistoryNavigator() {
  return (
    <HistoryStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: '600' },
        headerShadowVisible: false,
      }}>
      <HistoryStack.Screen
        name="HistoryCalendar"
        component={HistoryScreen}
        options={{ title: 'History' }}
      />
      <HistoryStack.Screen
        name="DayDetail"
        component={DayDetailScreen}
        options={{ title: 'Day Detail' }}
      />
    </HistoryStack.Navigator>
  );
}

function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: '600' },
        headerShadowVisible: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
        },
        tabBarIcon: ({ focused }) => {
          const iconMap = {
            Home: 'home',
            History: 'calendar',
            Settings: 'settings',
          } as const;
          return <TabIcon name={iconMap[route.name]} focused={focused} />;
        },
      })}>
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{ headerShown: false, title: APP_NAME }}
      />
      <Tab.Screen
        name="History"
        component={HistoryNavigator}
        options={{ headerShown: false, title: 'History' }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ title: 'Settings' }}
      />
    </Tab.Navigator>
  );
}

export function MainNavigator() {
  return (
    <MainStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: '600' },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: colors.background },
      }}>
      <MainStack.Screen
        name="Tabs"
        component={TabNavigator}
        options={{ headerShown: false }}
      />
      <MainStack.Screen
        name="AddEntry"
        component={AddEntryScreen}
        options={{ title: 'Add Entry' }}
      />
      <MainStack.Screen
        name="MyFoods"
        component={MyFoodsScreen}
        options={{ title: 'My Foods' }}
      />
    </MainStack.Navigator>
  );
}
