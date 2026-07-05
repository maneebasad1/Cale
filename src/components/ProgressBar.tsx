import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing } from '../constants/theme';

interface ProgressBarProps {
  consumed: number;
  target: number;
}

export function ProgressBar({ consumed, target }: ProgressBarProps) {
  const progress = target > 0 ? Math.min(consumed / target, 1) : 0;
  const isOver = consumed > target;
  const barColor = isOver ? colors.overMaintenance : colors.primary;
  const remaining = target - consumed;

  return (
    <View style={styles.container}>
      <Text style={[styles.remainingHero, isOver && styles.over]}>
        {isOver
          ? `${Math.abs(remaining).toLocaleString()} kcal over`
          : `${remaining.toLocaleString()} kcal left today`}
      </Text>
      <View style={styles.track}>
        <View
          style={[
            styles.fill,
            { width: `${progress * 100}%`, backgroundColor: barColor },
          ]}
        />
      </View>
      <View style={styles.footer}>
        <Text style={styles.consumed}>{consumed.toLocaleString()} kcal eaten</Text>
        <Text style={styles.target}>Target {target.toLocaleString()}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: 12,
  },
  remainingHero: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: spacing.sm,
  },
  over: {
    color: colors.overMaintenance,
  },
  track: {
    height: 12,
    backgroundColor: colors.border,
    borderRadius: 6,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 6,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  consumed: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  target: {
    fontSize: 14,
    color: colors.textSecondary,
  },
});
