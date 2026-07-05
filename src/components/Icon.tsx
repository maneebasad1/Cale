import React from 'react';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { colors } from '../constants/theme';

export type IconName =
  | 'home'
  | 'calendar'
  | 'settings'
  | 'add'
  | 'checkmark-circle'
  | 'trending-down'
  | 'trending-up'
  | 'person'
  | 'fitness'
  | 'flag'
  | 'flame'
  | 'arrow-down'
  | 'arrow-up'
  | 'create-outline'
  | 'trash-outline';

const TAB_ICONS: Record<
  'home' | 'calendar' | 'settings',
  { active: string; inactive: string }
> = {
  home: { active: 'home', inactive: 'home-outline' },
  calendar: { active: 'calendar', inactive: 'calendar-outline' },
  settings: { active: 'settings', inactive: 'settings-outline' },
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
  if (name === 'home' || name === 'calendar' || name === 'settings') {
    const iconName = focused
      ? TAB_ICONS[name].active
      : TAB_ICONS[name].inactive;
    return <Ionicons name={iconName} size={size} color={color} />;
  }

  return <Ionicons name={name} size={size} color={color} />;
}

interface TabIconProps {
  name: 'home' | 'calendar' | 'settings';
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
