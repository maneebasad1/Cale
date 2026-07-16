import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  CalorieAdjustmentField,
  isCalorieAdjustmentValid,
} from '../../components/CalorieAdjustmentField';
import { KeyboardAwareScreen } from '../../components/KeyboardAwareScreen';
import { LabeledInput } from '../../components/LabeledInput';
import { FormSection } from '../../components/onboarding/FormSection';
import { OnboardingFooter } from '../../components/onboarding/OnboardingFooter';
import { OnboardingHeader } from '../../components/onboarding/OnboardingHeader';
import { SelectionCard } from '../../components/onboarding/SelectionCard';
import { Screen } from '../../components/Screen';
import { colors, spacing, typography } from '../../constants/theme';
import type { OnboardingStackParamList } from '../../navigation/types';
import type { GoalType } from '../../types';
import { GOAL_OPTIONS } from '../../types';
import {
  autoAdjustmentMagnitude,
  resolveAdjustmentPreview,
} from '../../utils/weightTimeline';
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
  const [adjustmentInput, setAdjustmentInput] = useState('');
  const [adjustmentIsCustom, setAdjustmentIsCustom] = useState(false);

  const goalWeightKg = useMemo(() => {
    const num = parseFloat(goalWeight);
    if (!num) {
      return 0;
    }
    return weightUnit === 'kg' ? num : lbToKg(num);
  }, [goalWeight, weightUnit]);

  const autoMagnitude = useMemo(() => {
    if (!goalType || goalType === 'maintain' || !goalWeightKg) {
      return 0;
    }
    return autoAdjustmentMagnitude(goalType, weightKg, goalWeightKg);
  }, [goalType, goalWeightKg, weightKg]);

  useEffect(() => {
    if (!goalType || goalType === 'maintain' || adjustmentIsCustom) {
      return;
    }
    if (autoMagnitude > 0) {
      setAdjustmentInput(String(autoMagnitude));
    }
  }, [goalType, autoMagnitude, adjustmentIsCustom]);

  const preview = useMemo(() => {
    if (
      !goalType ||
      goalType === 'maintain' ||
      !goalWeightKg ||
      !isCalorieAdjustmentValid(
        goalType,
        adjustmentInput,
        maintenanceCalories,
        gender,
      )
    ) {
      return null;
    }

    const magnitude = Math.abs(parseFloat(adjustmentInput) || 0);
    return resolveAdjustmentPreview({
      goalType,
      magnitude,
      maintenanceCalories,
      gender,
      currentWeightKg: weightKg,
      goalWeightKg,
      weightUnit,
    });
  }, [
    goalType,
    goalWeightKg,
    adjustmentInput,
    maintenanceCalories,
    gender,
    weightKg,
    weightUnit,
  ]);

  const isValid = () => {
    if (!goalType || !goalWeightKg) {
      return false;
    }
    if (goalType === 'maintain') {
      return true;
    }
    if (goalType === 'lose') {
      if (goalWeightKg >= weightKg) {
        return false;
      }
    } else if (goalWeightKg <= weightKg) {
      return false;
    }
    return isCalorieAdjustmentValid(
      goalType,
      adjustmentInput,
      maintenanceCalories,
      gender,
    );
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
      calorieAdjustment: preview.calorieAdjustment,
      dailyTargetCalories: preview.dailyTargetCalories,
      adjustmentIsCustom,
    });
  };

  const handleSkipToMaintain = () => {
    navigation.navigate('Summary', {
      ...route.params,
      goalType: 'maintain',
      goalWeightKg: weightKg,
      calorieAdjustment: 0,
      dailyTargetCalories: maintenanceCalories,
      adjustmentIsCustom: false,
    });
  };

  const handleGoalTypeSelect = (nextGoalType: GoalType) => {
    setGoalType(nextGoalType);
    setAdjustmentIsCustom(false);
  };

  const handleAdjustmentChange = (text: string) => {
    setAdjustmentInput(text);
    setAdjustmentIsCustom(true);
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
          subtitle="Choose lose or gain, then set a target weight and daily pace."
        />

        <View style={styles.goalOptions}>
          {GOAL_OPTIONS.filter(option => option.value !== 'maintain').map(
            option => (
              <SelectionCard
                key={option.value}
                label={option.label}
                description={option.description}
                selected={goalType === option.value}
                onPress={() => handleGoalTypeSelect(option.value)}
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

        {goalType && goalType !== 'maintain' && (
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

        {goalType && goalType !== 'maintain' && goalWeightKg > 0 && (
          <CalorieAdjustmentField
            goalType={goalType}
            gender={gender}
            maintenanceCalories={maintenanceCalories}
            currentWeightKg={weightKg}
            goalWeightKg={goalWeightKg}
            weightUnit={weightUnit}
            value={adjustmentInput}
            onChangeText={handleAdjustmentChange}
          />
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
});
