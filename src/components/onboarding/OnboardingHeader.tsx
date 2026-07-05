import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing } from '../../constants/theme';
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
    fontSize: 26,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: 15,
    color: colors.textSecondary,
    lineHeight: 22,
  },
});
