import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Icon } from './Icon';
import { LabeledInput } from './LabeledInput';
import { colors, fonts, radii, spacing, typography } from '../constants/theme';
import type { Gender, GoalType, WeightUnit } from '../types';
import {
  adjustmentValidationMessage,
  autoAdjustmentMagnitude,
  MAX_DAILY_ADJUSTMENT,
  resolveAdjustmentPreview,
  validateAdjustmentInput,
} from '../utils/weightTimeline';

interface CalorieAdjustmentFieldProps {
  goalType: GoalType;
  gender: Gender;
  maintenanceCalories: number;
  currentWeightKg: number;
  goalWeightKg: number;
  weightUnit: WeightUnit;
  value: string;
  onChangeText: (text: string) => void;
  variant?: 'onboarding' | 'profile';
}

export function CalorieAdjustmentField({
  goalType,
  gender,
  maintenanceCalories,
  currentWeightKg,
  goalWeightKg,
  weightUnit,
  value,
  onChangeText,
  variant = 'onboarding',
}: CalorieAdjustmentFieldProps) {
  const autoMagnitude = useMemo(
    () => autoAdjustmentMagnitude(goalType, currentWeightKg, goalWeightKg),
    [goalType, currentWeightKg, goalWeightKg],
  );

  const validationError = useMemo(
    () =>
      validateAdjustmentInput({
        goalType,
        rawInput: value,
        maintenanceCalories,
        gender,
      }),
    [goalType, value, maintenanceCalories, gender],
  );

  const magnitude = Math.abs(parseFloat(value) || 0);
  const preview = useMemo(() => {
    if (!magnitude || validationError) {
      return null;
    }
    return resolveAdjustmentPreview({
      goalType,
      magnitude,
      maintenanceCalories,
      gender,
      currentWeightKg,
      goalWeightKg,
      weightUnit,
    });
  }, [
    goalType,
    magnitude,
    validationError,
    maintenanceCalories,
    gender,
    currentWeightKg,
    goalWeightKg,
    weightUnit,
  ]);

  if (goalType === 'maintain') {
    return null;
  }

  const adjustmentNoun = goalType === 'lose' ? 'deficit' : 'surplus';
  const weightUnitLabel = weightUnit === 'kg' ? 'kg' : 'lb';
  const isProfile = variant === 'profile';

  return (
    <View style={styles.container}>
      <LabeledInput
        label={`Daily calorie ${adjustmentNoun}`}
        value={value}
        onChangeText={onChangeText}
        placeholder={String(autoMagnitude)}
        keyboardType="numeric"
        suffix="kcal/day"
      />
      <Text style={styles.caption}>
        Estimates only — not medical advice. Max {MAX_DAILY_ADJUSTMENT.toLocaleString()}{' '}
        kcal/day.
      </Text>

      {validationError ? (
        <Text style={styles.error}>
          {adjustmentValidationMessage(validationError, goalType)}
        </Text>
      ) : null}

      {preview ? (
        <View style={[styles.previewCard, isProfile && styles.previewCardProfile]}>
          <View style={styles.previewRow}>
            <Icon
              name={goalType === 'lose' ? 'arrow-down' : 'arrow-up'}
              size={20}
              color={isProfile ? colors.nori : colors.primary}
            />
            <Text
              style={[styles.previewLabel, isProfile && styles.previewLabelProfile]}>
              Daily {adjustmentNoun}
            </Text>
          </View>
          <Text style={[styles.previewAdjustment, isProfile && styles.previewAdjustmentProfile]}>
            {magnitude.toLocaleString()} kcal
          </Text>

          <View style={styles.previewDivider} />

          <Text style={styles.previewTargetLabel}>Your daily target</Text>
          <Text style={[styles.previewTarget, isProfile && styles.previewTargetProfile]}>
            {preview.dailyTargetCalories.toLocaleString()} kcal/day
          </Text>
          <Text style={styles.previewMaintenance}>
            Maintenance: {maintenanceCalories.toLocaleString()} kcal
          </Text>

          <Text style={[styles.previewEstimate, isProfile && styles.previewEstimateProfile]}>
            Estimated ~{preview.weeklyWeightChange} {weightUnitLabel} per week toward your
            goal
          </Text>

          {preview.timelineMessage ? (
            <Text style={[styles.timelineMessage, isProfile && styles.timelineMessageProfile]}>
              {preview.timelineMessage}
            </Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

export function isCalorieAdjustmentValid(
  goalType: GoalType,
  rawInput: string,
  maintenanceCalories: number,
  gender: Gender,
): boolean {
  if (goalType === 'maintain') {
    return true;
  }
  return (
    validateAdjustmentInput({
      goalType,
      rawInput,
      maintenanceCalories,
      gender,
    }) === null
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: spacing.sm,
  },
  caption: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: -spacing.sm,
    marginBottom: spacing.sm,
  },
  error: {
    ...typography.caption,
    color: colors.error,
    marginBottom: spacing.sm,
  },
  previewCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.lg,
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  previewCardProfile: {
    backgroundColor: colors.porcelain,
    borderColor: colors.nori,
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  previewLabel: {
    ...typography.overline,
    color: colors.textSecondary,
  },
  previewLabelProfile: {
    color: colors.stone,
  },
  previewAdjustment: {
    fontFamily: fonts.displayBold,
    fontSize: 28,
    color: colors.text,
    marginBottom: spacing.md,
  },
  previewAdjustmentProfile: {
    color: colors.ink,
  },
  previewDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginBottom: spacing.md,
  },
  previewTargetLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  previewTarget: {
    fontFamily: fonts.displayBold,
    fontSize: 36,
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  previewTargetProfile: {
    fontSize: 32,
    color: colors.nori,
  },
  previewMaintenance: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  previewEstimate: {
    ...typography.caption,
    color: colors.primaryDark,
    marginBottom: spacing.xs,
  },
  previewEstimateProfile: {
    color: colors.nori,
  },
  timelineMessage: {
    ...typography.caption,
    color: colors.text,
    lineHeight: 18,
  },
  timelineMessageProfile: {
    color: colors.ink,
  },
});
