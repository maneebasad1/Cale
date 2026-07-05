import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors, spacing } from '../constants/theme';
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
            activeOpacity={0.7}>
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
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    backgroundColor: colors.chipBg,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  chipSelected: {
    backgroundColor: colors.chipSelected,
    borderColor: colors.chipSelected,
  },
  chipText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.primary,
  },
  chipTextSelected: {
    color: colors.surface,
  },
});
