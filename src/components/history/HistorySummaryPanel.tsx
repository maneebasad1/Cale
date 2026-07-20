import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { CalorieLineChart } from './CalorieLineChart';
import { EmptyState } from '../EmptyState';
import { colors, fonts, radii, spacing, typography } from '../../constants/theme';
import type { GoalType } from '../../types';
import type { WorkoutEntry } from '../../types/workout';
import type { PeriodSummary } from '../../utils/calorieStats';
import { formatShortDate } from '../../utils/date';

interface HistorySummaryPanelProps {
  summary: PeriodSummary;
  goalType: GoalType;
  periodLabel: string;
  workoutDays?: Record<string, WorkoutEntry[]>;
}

export function HistorySummaryPanel({
  summary,
  goalType,
  periodLabel,
  workoutDays = {},
}: HistorySummaryPanelProps) {
  const bestLabel =
    goalType === 'maintain' ? 'Closest to target' : 'Best day';
  const worstLabel =
    goalType === 'maintain' ? 'Furthest from target' : 'Highest day';

  const hasLoggedDays = summary.days.some(day => day.total > 0);

  const topWorkoutName = (() => {
    const counts = new Map<string, number>();
    Object.values(workoutDays).forEach(entries => {
      entries.forEach(entry => {
        counts.set(entry.name, (counts.get(entry.name) ?? 0) + 1);
      });
    });
    const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
    return sorted[0]?.[0] ?? null;
  })();

  if (!hasLoggedDays && summary.totalWorkoutCalories === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.period}>{periodLabel}</Text>
        <EmptyState
          icon="calendar"
          title="No meals logged yet"
          message="Log a few days and your averages will show up here."
        />
      </View>
    );
  }

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

      {summary.totalWorkoutCalories > 0 ? (
        <Text style={styles.workoutLine}>
          {summary.totalWorkoutCalories.toLocaleString()} kcal burned
          {topWorkoutName ? ` · most logged: ${topWorkoutName}` : ''}
        </Text>
      ) : null}

      <CalorieLineChart days={summary.days} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg - 2,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  period: {
    ...typography.title,
    fontSize: 20,
    lineHeight: 26,
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
    borderRadius: radii.md,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statLabel: {
    ...typography.overline,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  statValue: {
    fontFamily: fonts.displayBold,
    fontSize: 20,
    lineHeight: 26,
    color: colors.text,
  },
  statUnit: {
    ...typography.caption,
    fontFamily: fonts.body,
    color: colors.textSecondary,
    marginTop: 2,
  },
  workoutLine: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
});
