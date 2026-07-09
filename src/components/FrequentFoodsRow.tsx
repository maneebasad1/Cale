import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors, fonts, radii, spacing, typography } from '../constants/theme';
import type { FoodItem } from '../types/food';

interface FrequentFoodsRowProps {
  foods: FoodItem[];
  selectedIds?: string[];
  onSelect: (food: FoodItem) => void;
}

export function FrequentFoodsRow({
  foods,
  selectedIds = [],
  onSelect,
}: FrequentFoodsRowProps) {
  if (!foods.length) {
    return null;
  }

  const selectedSet = new Set(selectedIds);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Your usual</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}>
        {foods.map(food => {
          const selected = selectedSet.has(food.id);
          return (
            <TouchableOpacity
              key={food.id}
              style={[styles.chip, selected && styles.chipSelected]}
              onPress={() => onSelect(food)}
              activeOpacity={0.7}
              accessibilityRole="checkbox"
              accessibilityState={{ selected }}>
              <Text
                style={[styles.chipName, selected && styles.chipNameSelected]}
                numberOfLines={1}>
                {food.name}
              </Text>
              <Text style={[styles.chipCal, selected && styles.chipCalSelected]}>
                {food.calories} kcal
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.sm,
  },
  title: {
    ...typography.overline,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  row: {
    gap: spacing.sm,
    paddingRight: spacing.sm,
  },
  chip: {
    maxWidth: 140,
    backgroundColor: colors.background,
    borderRadius: radii.sm + 2,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  chipSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.noriMute,
  },
  chipName: {
    ...typography.label,
    color: colors.text,
    marginBottom: 2,
  },
  chipNameSelected: {
    color: colors.primaryDark,
  },
  chipCal: {
    ...typography.caption,
    fontFamily: fonts.body,
    color: colors.textSecondary,
  },
  chipCalSelected: {
    color: colors.primary,
  },
});
