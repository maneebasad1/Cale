import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, fonts, radii, spacing, typography } from '../../constants/theme';

interface OnboardingCaloriePreviewProps {
  calories: number;
  caption: string;
  hint?: string;
}

export function OnboardingCaloriePreview({
  calories,
  caption,
  hint,
}: OnboardingCaloriePreviewProps) {
  return (
    <View
      style={styles.card}
      accessibilityRole="summary"
      accessibilityLabel={`${caption}: ${calories} kilocalories per day`}>
      <Text style={styles.caption}>{caption}</Text>
      <Text style={styles.value}>{calories.toLocaleString()}</Text>
      <Text style={styles.unit}>kcal / day</Text>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.primary,
    borderRadius: radii.xl,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  caption: {
    ...typography.label,
    color: 'rgba(255,255,255,0.85)',
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  value: {
    fontFamily: fonts.displayBold,
    fontSize: 44,
    lineHeight: 52,
    color: colors.surface,
  },
  unit: {
    ...typography.body,
    color: 'rgba(255,255,255,0.85)',
    marginTop: spacing.xs,
  },
  hint: {
    ...typography.caption,
    color: 'rgba(255,255,255,0.8)',
    marginTop: spacing.sm,
    textAlign: 'center',
  },
});
