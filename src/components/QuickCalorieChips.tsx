import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors, radii, spacing, typography } from '../constants/theme';

const QUICK_AMOUNTS = [100, 250, 500];

interface QuickCalorieChipsProps {
  onAdd: (amount: number) => void;
  /** Current value; chips are disabled once it reaches `max`. */
  current?: number;
  max?: number;
}

export function QuickCalorieChips({
  onAdd,
  current = 0,
  max,
}: QuickCalorieChipsProps) {
  const atMax = max !== undefined && current >= max;
  return (
    <View style={styles.container}>
      <Text style={styles.label}>Quick add</Text>
      <View style={styles.row}>
        {QUICK_AMOUNTS.map(amount => (
          <TouchableOpacity
            key={amount}
            style={[styles.chip, atMax && styles.chipDisabled]}
            onPress={() => onAdd(amount)}
            disabled={atMax}
            accessibilityState={{ disabled: atMax }}
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
    ...typography.overline,
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
    borderRadius: radii.pill,
    backgroundColor: colors.noriMute,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  chipDisabled: {
    opacity: 0.4,
  },
  chipText: {
    ...typography.label,
    color: colors.primary,
  },
});
