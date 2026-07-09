import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  colors,
  fonts,
  getProgressTone,
  progressColor,
  radii,
  spacing,
  typography,
} from '../constants/theme';

interface ProgressBarProps {
  consumed: number;
  target: number;
}

/** Compact linear progress — used on Day Detail / denser layouts. */
export function ProgressBar({ consumed, target }: ProgressBarProps) {
  const progress = target > 0 ? Math.min(consumed / target, 1) : 0;
  const tone = getProgressTone(consumed, target);
  const barColor = progressColor(tone);
  const remaining = target - consumed;
  const isOver = consumed > target;

  return (
    <View style={styles.container}>
      <Text style={[styles.remainingHero, { color: barColor }]}>
        {isOver
          ? `${Math.abs(remaining).toLocaleString()} kcal over`
          : `${remaining.toLocaleString()} kcal left`}
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
        <Text style={styles.consumed}>{consumed.toLocaleString()} eaten</Text>
        <Text style={styles.target}>Target {target.toLocaleString()}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
  },
  remainingHero: {
    fontFamily: fonts.displayBold,
    fontSize: 24,
    lineHeight: 30,
    marginBottom: spacing.sm,
  },
  track: {
    height: 10,
    backgroundColor: colors.border,
    borderRadius: 5,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 5,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  consumed: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  target: {
    ...typography.caption,
    color: colors.textSecondary,
  },
});
