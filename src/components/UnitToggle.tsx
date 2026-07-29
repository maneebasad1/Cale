import React from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';
import { colors, radii, spacing, typography } from '../constants/theme';
import { Icon, type IconName } from './Icon';

interface UnitToggleOption<T extends string> {
  value: T;
  label: string;
  icon?: IconName;
}

interface UnitToggleProps<T extends string> {
  options: UnitToggleOption<T>[];
  value: T;
  onChange: (value: T) => void;
  style?: ViewStyle;
}

export function UnitToggle<T extends string>({
  options,
  value,
  onChange,
  style,
}: UnitToggleProps<T>) {
  return (
    <View style={[styles.container, style]}>
      {options.map(option => {
        const selected = option.value === value;
        return (
          <TouchableOpacity
            key={option.value}
            style={[styles.option, selected && styles.optionSelected]}
            onPress={() => onChange(option.value)}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityState={{ selected }}>
            <View style={styles.optionContent}>
              {option.icon ? (
                <Icon
                  name={option.icon}
                  size={14}
                  color={selected ? colors.primary : colors.textSecondary}
                />
              ) : null}
              <Text style={[styles.label, selected && styles.labelSelected]}>
                {option.label}
              </Text>
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: colors.border,
    borderRadius: radii.sm,
    padding: 2,
  },
  option: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderRadius: 6,
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  optionSelected: {
    backgroundColor: colors.surface,
  },
  label: {
    ...typography.label,
    color: colors.textSecondary,
  },
  labelSelected: {
    color: colors.primary,
  },
});
