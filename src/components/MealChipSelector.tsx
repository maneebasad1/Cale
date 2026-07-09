import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Icon, MEAL_ICONS } from './Icon';
import { colors, radii, spacing, typography } from '../constants/theme';
import type { MealType } from '../types';
import { MEAL_LABELS, MEAL_TYPES } from '../types';

interface MealChipSelectorProps {
  value: MealType;
  onChange: (mealType: MealType) => void;
}

export function MealChipSelector({ value, onChange }: MealChipSelectorProps) {
  return (
    <View style={styles.container}>
      {MEAL_TYPES.map(mealType => {
        const selected = mealType === value;
        return (
          <TouchableOpacity
            key={mealType}
            style={[styles.chip, selected && styles.chipSelected]}
            onPress={() => onChange(mealType)}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityState={{ selected }}>
            <Icon
              name={MEAL_ICONS[mealType]}
              size={16}
              color={selected ? colors.surface : colors.primary}
            />
            <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
              {MEAL_LABELS[mealType]}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
    backgroundColor: colors.chipBg,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  chipSelected: {
    backgroundColor: colors.chipSelected,
    borderColor: colors.chipSelected,
  },
  chipText: {
    ...typography.label,
    color: colors.primary,
  },
  chipTextSelected: {
    color: colors.surface,
  },
});
