import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors, spacing } from '../constants/theme';

const QUICK_AMOUNTS = [100, 250, 500];

interface QuickCalorieChipsProps {
  onAdd: (amount: number) => void;
}

export function QuickCalorieChips({ onAdd }: QuickCalorieChipsProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>Quick add</Text>
      <View style={styles.row}>
        {QUICK_AMOUNTS.map(amount => (
          <TouchableOpacity
            key={amount}
            style={styles.chip}
            onPress={() => onAdd(amount)}
            activeOpacity={0.7}>
            <Text style={styles.chipText}>+{amount}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.sm,
  },
  label: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    backgroundColor: colors.chipBg,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  chipText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
});
