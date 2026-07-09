import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, fonts, spacing, typography } from '../../constants/theme';
import { OnboardingProgress } from './OnboardingProgress';

interface OnboardingHeaderProps {
  step: number;
  title: string;
  subtitle: string;
}

export function OnboardingHeader({
  step,
  title,
  subtitle,
}: OnboardingHeaderProps) {
  return (
    <View style={styles.container}>
      <OnboardingProgress currentStep={step} />
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.lg,
  },
  title: {
    fontFamily: fonts.displayBold,
    fontSize: 28,
    lineHeight: 34,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
  },
});
