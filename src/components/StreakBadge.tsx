import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing } from '../constants/theme';

interface StreakBadgeProps {
  streak: number;
}

export function StreakBadge({ streak }: StreakBadgeProps) {
  if (streak <= 0) {
    return (
      <View style={styles.neutral}>
        <Text style={styles.neutralText}>Log today to start a streak</Text>
      </View>
    );
  }

  return (
    <View style={styles.badge}>
      <Text style={styles.emoji}>🔥</Text>
      <Text style={styles.text}>
        {streak} day{streak === 1 ? '' : 's'} streak
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: colors.chipBg,
    borderRadius: 20,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    marginBottom: spacing.sm,
    gap: spacing.xs,
  },
  emoji: {
    fontSize: 16,
  },
  text: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primaryDark,
  },
  neutral: {
    marginBottom: spacing.sm,
  },
  neutralText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
});
