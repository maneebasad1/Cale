import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Icon } from './Icon';
import { colors, radii, spacing, typography } from '../constants/theme';

interface StreakBadgeProps {
  streak: number;
}

export function StreakBadge({ streak }: StreakBadgeProps) {
  if (streak <= 0) {
    return (
      <View style={styles.neutral}>
        <Icon name="flame-outline" size={16} color={colors.textSecondary} />
        <Text style={styles.neutralText}>Log today to start a streak</Text>
      </View>
    );
  }

  return (
    <View style={styles.badge} accessibilityLabel={`${streak} day streak`}>
      <Icon name="flame" size={16} color={colors.saffron} />
      <Text style={styles.text}>
        {streak}-day streak
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: colors.saffronMute,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    marginBottom: spacing.md,
    gap: spacing.xs,
  },
  text: {
    ...typography.label,
    color: colors.text,
  },
  neutral: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  neutralText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
});
