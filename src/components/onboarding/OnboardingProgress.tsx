import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing } from '../../constants/theme';

interface OnboardingProgressProps {
  currentStep: number;
  totalSteps?: number;
}

export function OnboardingProgress({
  currentStep,
  totalSteps = 5,
}: OnboardingProgressProps) {
  return (
    <View style={styles.container}>
      <View style={styles.progressRow}>
        {Array.from({ length: totalSteps }, (_, i) => (
          <View
            key={i}
            style={[
              styles.segment,
              i + 1 <= currentStep ? styles.segmentActive : styles.segmentInactive,
            ]}
          />
        ))}
      </View>
      <Text style={styles.stepLabel}>
        Step {currentStep} of {totalSteps}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.sm,
  },
  progressRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  segment: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
  segmentActive: {
    backgroundColor: colors.primary,
  },
  segmentInactive: {
    backgroundColor: colors.border,
  },
  stepLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
