import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors, spacing } from '../constants/theme';
import type { FoodItem } from '../types/food';

interface FrequentFoodsRowProps {
  foods: FoodItem[];
  selectedId?: string | null;
  onSelect: (food: FoodItem) => void;
}

export function FrequentFoodsRow({
  foods,
  selectedId,
  onSelect,
}: FrequentFoodsRowProps) {
  if (!foods.length) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Your usual</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}>
        {foods.map(food => {
          const selected = selectedId === food.id;
          return (
            <TouchableOpacity
              key={food.id}
              style={[styles.chip, selected && styles.chipSelected]}
              onPress={() => onSelect(food)}
              activeOpacity={0.7}>
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
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
  },
  row: {
    gap: spacing.sm,
    paddingRight: spacing.sm,
  },
  chip: {
    maxWidth: 140,
    backgroundColor: colors.background,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  chipSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.chipBg,
  },
  chipName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  chipNameSelected: {
    color: colors.primaryDark,
  },
  chipCal: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  chipCalSelected: {
    color: colors.primary,
  },
});
