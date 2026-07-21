import React from 'react';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { colors } from '../constants/theme';
import type { MealType } from '../types';

export type IconName =
  | 'home'
  | 'calendar'
  | 'person'
  | 'settings'
  | 'add'
  | 'checkmark-circle'
  | 'checkmark-circle-outline'
  | 'trending-down'
  | 'trending-up'
  | 'fitness'
  | 'fitness-outline'
  | 'flag'
  | 'flag-outline'
  | 'flame'
  | 'flame-outline'
  | 'arrow-down'
  | 'arrow-up'
  | 'create-outline'
  | 'trash-outline'
  | 'notifications-outline'
  | 'person-circle-outline'
  | 'settings-outline'
  | 'restaurant-outline'
  | 'scale-outline'
  | 'body-outline'
  | 'log-out-outline'
  | 'sunny-outline'
  | 'partly-sunny-outline'
  | 'moon-outline'
  | 'cafe-outline'
  | 'nutrition-outline'
  | 'book-outline'
  | 'search-outline'
  | 'chevron-forward'
  | 'close'
  | 'time-outline'
  | 'alert-circle-outline'
  | 'leaf-outline'
  | 'mail-outline'
  | 'lock-closed-outline'
  | 'eye-outline'
  | 'eye-off-outline'
  | 'logo-google'
  | 'cloud-upload-outline';

const TAB_ICONS: Record<
  'home' | 'calendar' | 'person',
  { active: string; inactive: string }
> = {
  home: { active: 'home', inactive: 'home-outline' },
  calendar: { active: 'calendar', inactive: 'calendar-outline' },
  person: { active: 'person', inactive: 'person-outline' },
};

export const MEAL_ICONS: Record<MealType, IconName> = {
  breakfast: 'sunny-outline',
  lunch: 'partly-sunny-outline',
  dinner: 'moon-outline',
  snack: 'cafe-outline',
};

interface IconProps {
  name: IconName;
  size?: number;
  color?: string;
  focused?: boolean;
}

export function Icon({
  name,
  size = 24,
  color = colors.text,
  focused,
}: IconProps) {
  if (name === 'home' || name === 'calendar' || name === 'person') {
    const iconName = focused
      ? TAB_ICONS[name].active
      : TAB_ICONS[name].inactive;
    return <Ionicons name={iconName} size={size} color={color} />;
  }

  return <Ionicons name={name} size={size} color={color} />;
}

interface TabIconProps {
  name: 'home' | 'calendar' | 'person';
  focused: boolean;
  size?: number;
}

export function TabIcon({ name, focused, size = 24 }: TabIconProps) {
  return (
    <Icon
      name={name}
      size={size}
      color={focused ? colors.primary : colors.textSecondary}
      focused={focused}
    />
  );
}
