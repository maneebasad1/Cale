import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { CalorieBarChart } from './CalorieBarChart';
import { colors, spacing } from '../../constants/theme';
import type { GoalType } from '../../types';
import type { PeriodSummary } from '../../utils/calorieStats';
import { formatShortDate } from '../../utils/date';

interface HistorySummaryPanelProps {
  summary: PeriodSummary;
  target: number;
  goalType: GoalType;
  periodLabel: string;
}

export function HistorySummaryPanel({
  summary,
  target,
  goalType,
  periodLabel,
}: HistorySummaryPanelProps) {
  const bestLabel =
    goalType === 'maintain' ? 'Closest to target' : 'Best day';
  const worstLabel =
    goalType === 'maintain' ? 'Furthest from target' : 'Worst day';

  return (
    <View style={styles.container}>
      <Text style={styles.period}>{periodLabel}</Text>

      <View style={styles.statRow}>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Avg daily</Text>
          <Text style={styles.statValue}>
            {summary.averageDailyCalories.toLocaleString()}
          </Text>
          <Text style={styles.statUnit}>kcal</Text>
        </View>
        {summary.bestDay && (
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>{bestLabel}</Text>
            <Text style={styles.statValue}>
              {summary.bestDay.total.toLocaleString()}
            </Text>
            <Text style={styles.statUnit}>
              {formatShortDate(summary.bestDay.date)}
            </Text>
          </View>
        )}
        {summary.worstDay && (
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>{worstLabel}</Text>
            <Text style={styles.statValue}>
              {summary.worstDay.total.toLocaleString()}
            </Text>
            <Text style={styles.statUnit}>
              {formatShortDate(summary.worstDay.date)}
            </Text>
          </View>
        )}
      </View>

      <CalorieBarChart days={summary.days} target={target} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  period: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.md,
  },
  statRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: 10,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: spacing.xs,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  statUnit: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
});
