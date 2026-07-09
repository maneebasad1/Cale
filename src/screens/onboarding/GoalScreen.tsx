import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Icon } from '../../components/Icon';
import { KeyboardAwareScreen } from '../../components/KeyboardAwareScreen';
import { LabeledInput } from '../../components/LabeledInput';
import { FormSection } from '../../components/onboarding/FormSection';
import { OnboardingFooter } from '../../components/onboarding/OnboardingFooter';
import { OnboardingHeader } from '../../components/onboarding/OnboardingHeader';
import { SelectionCard } from '../../components/onboarding/SelectionCard';
import { Screen } from '../../components/Screen';
import { colors, fonts, radii, spacing, typography } from '../../constants/theme';
import type { OnboardingStackParamList } from '../../navigation/types';
import type { GoalType } from '../../types';
import { GOAL_OPTIONS } from '../../types';
import {
  calculateCalorieAdjustment,
  calculateDailyTarget,
  estimateWeeklyWeightChange,
} from '../../utils/bmr';
import { displayWeight, kgToLb, lbToKg } from '../../utils/units';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'Goal'>;

export function GoalScreen({ route, navigation }: Props) {
  const {
    weightKg,
    gender,
    maintenanceCalories,
    weightUnit,
  } = route.params;

  const [goalType, setGoalType] = useState<GoalType | null>(null);
  const [goalWeight, setGoalWeight] = useState('');

  const goalWeightKg = useMemo(() => {
    const num = parseFloat(goalWeight);
    if (!num) {
      return 0;
    }
    return weightUnit === 'kg' ? num : lbToKg(num);
  }, [goalWeight, weightUnit]);

  const preview = useMemo(() => {
    if (!goalType || !goalWeightKg) {
      return null;
    }

    const adjustment = calculateCalorieAdjustment(
      goalType,
      weightKg,
      goalWeightKg,
    );
    const dailyTarget = calculateDailyTarget(
      maintenanceCalories,
      adjustment,
      gender,
      goalType,
    );
    const weeklyChange = estimateWeeklyWeightChange(adjustment);

    return { adjustment, dailyTarget, weeklyChange };
  }, [goalType, goalWeightKg, weightKg, maintenanceCalories, gender]);

  const isValid = () => {
    if (!goalType || !goalWeightKg) {
      return false;
    }
    if (goalType === 'lose') {
      return goalWeightKg < weightKg;
    }
    return goalWeightKg > weightKg;
  };

  const validationHint = () => {
    if (!goalType || !goalWeightKg) {
      return null;
    }
    if (goalType === 'lose' && goalWeightKg >= weightKg) {
      return 'Goal weight should be less than your current weight.';
    }
    if (goalType === 'gain' && goalWeightKg <= weightKg) {
      return 'Goal weight should be more than your current weight.';
    }
    return null;
  };

  const handleContinue = () => {
    if (!goalType || !preview) {
      return;
    }

    navigation.navigate('Summary', {
      ...route.params,
      goalType,
      goalWeightKg,
      calorieAdjustment: preview.adjustment,
      dailyTargetCalories: preview.dailyTarget,
    });
  };

  const handleSkipToMaintain = () => {
    navigation.navigate('Summary', {
      ...route.params,
      goalType: 'maintain',
      goalWeightKg: weightKg,
      calorieAdjustment: 0,
      dailyTargetCalories: maintenanceCalories,
    });
  };

  const defaultPlaceholder =
    weightUnit === 'kg'
      ? goalType === 'lose'
        ? String(Math.round(weightKg - 5))
        : String(Math.round(weightKg + 5))
      : goalType === 'lose'
        ? String(Math.round(kgToLb(weightKg - 5)))
        : String(Math.round(kgToLb(weightKg + 5)));

  return (
    <Screen edges={['bottom']}>
      <KeyboardAwareScreen
        contentContainerStyle={styles.scrollContent}
        footer={
          <OnboardingFooter
            title="See my plan"
            onPress={handleContinue}
            disabled={!isValid()}
          />
        }>
        <OnboardingHeader
          step={4}
          title="What's your goal?"
          subtitle="Choose lose or gain, then set a target weight."
        />

        <View style={styles.goalOptions}>
            {GOAL_OPTIONS.filter(option => option.value !== 'maintain').map(
              option => (
              <SelectionCard
                key={option.value}
                label={option.label}
                description={option.description}
                selected={goalType === option.value}
                onPress={() => setGoalType(option.value)}
                icon={option.icon}
              />
            ),
            )}
          </View>

          <SelectionCard
            label="Just show my maintenance calories"
            description="Skip — I don't have a specific goal right now"
            selected={goalType === 'maintain'}
            onPress={handleSkipToMaintain}
            icon="checkmark-circle"
          />

          {goalType && (
            <FormSection title="Goal weight">
              <Text style={styles.currentWeight}>
                Current: {displayWeight(weightKg, weightUnit)}
              </Text>
              <LabeledInput
                label=""
                value={goalWeight}
                onChangeText={setGoalWeight}
                placeholder={defaultPlaceholder}
                keyboardType="numeric"
                suffix={weightUnit}
              />
              {validationHint() && (
                <Text style={styles.error}>{validationHint()}</Text>
              )}
            </FormSection>
          )}

          {preview && isValid() && (
            <View style={styles.previewCard}>
              <View style={styles.previewRow}>
                <Icon
                  name={goalType === 'lose' ? 'arrow-down' : 'arrow-up'}
                  size={20}
                  color={goalType === 'lose' ? colors.warning : colors.primary}
                />
                <Text style={styles.previewLabel}>
                  Daily {goalType === 'lose' ? 'deficit' : 'surplus'}
                </Text>
              </View>
              <Text style={styles.previewAdjustment}>
                {Math.abs(preview.adjustment).toLocaleString()} kcal
              </Text>

              <View style={styles.previewDivider} />

              <Text style={styles.previewTargetLabel}>Your daily target</Text>
              <Text style={styles.previewTarget}>
                {preview.dailyTarget.toLocaleString()} kcal/day
              </Text>
              <Text style={styles.previewMaintenance}>
                Maintenance: {maintenanceCalories.toLocaleString()} kcal
              </Text>

              <Text style={styles.previewEstimate}>
                Estimated ~{preview.weeklyChange} kg per week toward your goal
              </Text>
            </View>
          )}
      </KeyboardAwareScreen>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.md,
  },
  goalOptions: {
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  currentWeight: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  error: {
    ...typography.caption,
    color: colors.error,
    marginTop: spacing.xs,
  },
  previewCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.lg,
    borderWidth: 1.5,
    borderColor: colors.primary,
    marginTop: spacing.sm,
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
  previewAdjustment: {
    fontFamily: fonts.displayBold,
    fontSize: 28,
    color: colors.text,
    marginBottom: spacing.md,
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
  previewMaintenance: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  previewEstimate: {
    ...typography.caption,
    color: colors.primaryDark,
  },
});
