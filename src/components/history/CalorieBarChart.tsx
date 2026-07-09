import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { DayStat } from '../../utils/calorieStats';
import {
  colors,
  fonts,
  getProgressTone,
  progressColor,
  radii,
  spacing,
  typography,
} from '../../constants/theme';
import { formatShortDate } from '../../utils/date';

interface CalorieBarChartProps {
  days: DayStat[];
  target: number;
}

export function CalorieBarChart({ days, target }: CalorieBarChartProps) {
  const maxTotal = Math.max(target, ...days.map(day => day.total), 1);

  return (
    <View style={styles.container}>
      <View style={styles.chart}>
        {days.map(day => {
          const heightPct = day.total > 0 ? (day.total / maxTotal) * 100 : 4;
          const tone = getProgressTone(day.total, target);
          const barColor =
            day.total > 0 ? progressColor(tone) : colors.border;
          return (
            <View key={day.date} style={styles.barWrap}>
              <View style={styles.barTrack}>
                <View
                  style={[
                    styles.barFill,
                    {
                      height: `${heightPct}%`,
                      backgroundColor: barColor,
                    },
                  ]}
                />
              </View>
              <Text style={styles.barLabel}>{formatShortDate(day.date)}</Text>
            </View>
          );
        })}
      </View>
      <Text style={styles.targetLine}>
        Target · {target.toLocaleString()} kcal
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: spacing.md,
  },
  chart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 120,
    gap: 4,
  },
  barWrap: {
    flex: 1,
    alignItems: 'center',
  },
  barTrack: {
    width: '100%',
    height: 90,
    justifyContent: 'flex-end',
    backgroundColor: colors.noriMute,
    borderRadius: radii.sm,
    overflow: 'hidden',
  },
  barFill: {
    width: '100%',
    borderRadius: radii.sm,
    minHeight: 4,
  },
  barLabel: {
    fontFamily: fonts.bodyMedium,
    fontSize: 9,
    lineHeight: 12,
    color: colors.textSecondary,
    marginTop: 4,
    textAlign: 'center',
  },
  targetLine: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
});
