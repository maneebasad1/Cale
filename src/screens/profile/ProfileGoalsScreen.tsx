import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Button } from '../../components/Button';
import {
  CalorieAdjustmentField,
  isCalorieAdjustmentValid,
} from '../../components/CalorieAdjustmentField';
import { KeyboardAwareScreen } from '../../components/KeyboardAwareScreen';
import { LabeledInput } from '../../components/LabeledInput';
import { Screen } from '../../components/Screen';
import { colors, fonts, radii, spacing, typography } from '../../constants/theme';
import { getProfile, saveProfile } from '../../services/storage';
import type { GoalType, UserProfile } from '../../types';
import { GOAL_OPTIONS } from '../../types';
import {
  promptCustomAdjustmentUpdate,
  shouldPromptCustomAdjustmentUpdate,
} from '../../utils/profileAdjustmentPrompt';
import { buildUpdatedProfile } from '../../utils/profileSave';
import {
  autoAdjustmentMagnitude,
  resolveAdjustmentPreview,
  signedAdjustment,
} from '../../utils/weightTimeline';
import {
  displayWeight,
  formatWeightInput,
  lbToKg,
  toDisplayWeightValue,
} from '../../utils/units';
import { isGoalReached } from '../../utils/bmr';
import { validateGoalWeightKg } from '../../utils/bodyValidation';
import { parseDecimal } from '../../utils/parseDecimal';
import { useApp } from '../../context/AppContext';

export function ProfileGoalsScreen() {
  const { refreshProfile } = useApp();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [goalType, setGoalType] = useState<GoalType>('lose');
  const [goalWeight, setGoalWeight] = useState('');
  const [adjustmentInput, setAdjustmentInput] = useState('');
  const [adjustmentIsCustom, setAdjustmentIsCustom] = useState(false);

  const loadProfile = useCallback(async () => {
    const p = await getProfile();
    if (!p) {
      return;
    }
    setProfile(p);
    setGoalType(p.goalType ?? 'lose');
    setGoalWeight(formatWeightInput(p.goalWeightKg, p.weightUnit));
    if (
      p.goalType !== 'maintain' &&
      isGoalReached(p.goalType, p.weightKg, p.goalWeightKg)
    ) {
      // Goal reached: the old deficit/surplus no longer applies. Start clean so
      // a newly entered goal picks up the auto-calculated adjustment.
      setAdjustmentInput('');
      setAdjustmentIsCustom(false);
      return;
    }
    const magnitude =
      p.adjustmentIsCustom && p.goalType !== 'maintain'
        ? Math.abs(p.calorieAdjustment)
        : autoAdjustmentMagnitude(
            p.goalType,
            p.weightKg,
            p.goalType === 'maintain' ? p.weightKg : p.goalWeightKg,
          );
    setAdjustmentInput(String(magnitude));
    setAdjustmentIsCustom(Boolean(p.adjustmentIsCustom));
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, [loadProfile]),
  );

  const goalWeightKg = useMemo(() => {
    if (!profile) {
      return 0;
    }
    if (goalType === 'maintain') {
      return profile.weightKg;
    }
    const num = parseDecimal(goalWeight);
    if (!num) {
      return 0;
    }
    // Untouched field: keep the stored goal exactly (no lb→kg rounding drift).
    if (
      Math.abs(
        num - toDisplayWeightValue(profile.goalWeightKg, profile.weightUnit),
      ) < 1e-9
    ) {
      return profile.goalWeightKg;
    }
    return profile.weightUnit === 'kg' ? num : lbToKg(num);
  }, [goalType, goalWeight, profile]);

  /** Stored goal is already reached/overshot (target is at maintenance). */
  const storedGoalReached =
    !!profile &&
    profile.goalType !== 'maintain' &&
    isGoalReached(profile.goalType, profile.weightKg, profile.goalWeightKg);

  /** Goal weight in the form is at/past the current weight for this goal. */
  const formGoalReached =
    !!profile &&
    goalType !== 'maintain' &&
    goalWeightKg > 0 &&
    isGoalReached(goalType, profile.weightKg, goalWeightKg);

  const autoMagnitude = useMemo(() => {
    if (!profile || goalType === 'maintain' || !goalWeightKg) {
      return 0;
    }
    return autoAdjustmentMagnitude(goalType, profile.weightKg, goalWeightKg);
  }, [profile, goalType, goalWeightKg]);

  useEffect(() => {
    if (!profile || adjustmentIsCustom || goalType === 'maintain') {
      return;
    }
    if (autoMagnitude > 0) {
      setAdjustmentInput(String(autoMagnitude));
    }
  }, [profile, adjustmentIsCustom, goalType, autoMagnitude]);

  const handleGoalTypeChange = (nextGoalType: GoalType) => {
    setGoalType(nextGoalType);
    if (nextGoalType === 'maintain') {
      setAdjustmentIsCustom(false);
      setAdjustmentInput('0');
      return;
    }
    setAdjustmentIsCustom(false);
  };

  const handleAdjustmentChange = (text: string) => {
    setAdjustmentInput(text);
    setAdjustmentIsCustom(true);
  };

  const persistGoals = async (
    useAutoAdjustment: boolean,
    nextGoalType: GoalType = goalType,
  ) => {
    if (!profile) {
      return;
    }

    const magnitude = Math.abs(parseFloat(adjustmentInput) || 0);
    const calorieAdjustment =
      nextGoalType === 'maintain'
        ? 0
        : useAutoAdjustment
          ? signedAdjustment(nextGoalType, autoMagnitude)
          : signedAdjustment(nextGoalType, magnitude);

    const updated = buildUpdatedProfile(profile, {
      goalType: nextGoalType,
      goalWeightKg:
        nextGoalType === 'maintain' ? profile.weightKg : goalWeightKg,
      calorieAdjustment,
      adjustmentIsCustom:
        nextGoalType !== 'maintain' && !useAutoAdjustment && adjustmentIsCustom,
    });
    await saveProfile(updated);
    setProfile(updated);
    setGoalType(nextGoalType);
    setAdjustmentIsCustom(Boolean(updated.adjustmentIsCustom));
    await refreshProfile();
    const targetMessage =
      nextGoalType === 'maintain'
        ? `Your daily target is now ${updated.dailyTargetCalories.toLocaleString()} kcal/day (maintenance).`
        : `Your daily target is now ${updated.dailyTargetCalories.toLocaleString()} kcal/day (${Math.abs(updated.calorieAdjustment)} kcal ${nextGoalType === 'lose' ? 'deficit' : 'surplus'}).`;
    Alert.alert('Goals updated', targetMessage);
  };

  const handleSave = async () => {
    if (!profile) {
      return;
    }

    if (goalType !== 'maintain') {
      const rangeError = validateGoalWeightKg(
        goalWeightKg,
        profile.weightUnit,
      );
      if (rangeError) {
        Alert.alert('Check your goal', rangeError);
        return;
      }
    }

    if (formGoalReached && storedGoalReached && goalType === profile.goalType) {
      Alert.alert(
        'You’ve reached your goal',
        `You’re already at ${displayWeight(profile.weightKg, profile.weightUnit)}. Set a new goal weight, or switch to maintaining your weight.`,
        [
          { text: 'Set new goal', style: 'cancel' },
          {
            text: 'Switch to maintain',
            onPress: () => {
              persistGoals(false, 'maintain');
            },
          },
        ],
      );
      return;
    }

    if (goalType === 'lose' && goalWeightKg >= profile.weightKg) {
      Alert.alert('Check your goal', 'Goal weight must be less than your current weight.');
      return;
    }

    if (goalType === 'gain' && goalWeightKg <= profile.weightKg) {
      Alert.alert('Check your goal', 'Goal weight must be more than your current weight.');
      return;
    }

    if (
      goalType !== 'maintain' &&
      !isCalorieAdjustmentValid(
        goalType,
        adjustmentInput,
        profile.maintenanceCalories,
        profile.gender,
      )
    ) {
      return;
    }

    const updates = { goalType, goalWeightKg };
    if (
      shouldPromptCustomAdjustmentUpdate(profile, updates) &&
      adjustmentIsCustom
    ) {
      promptCustomAdjustmentUpdate(profile, updates, useAuto =>
        persistGoals(useAuto),
      );
      return;
    }

    await persistGoals(false);
  };

  if (!profile) {
    return (
      <Screen edges={[]}>
        <View style={styles.loading}>
          <Text style={styles.loadingText}>Loading…</Text>
        </View>
      </Screen>
    );
  }

  const goalWeightHint = (() => {
    if (goalType === 'maintain' || !goalWeight.trim()) {
      return null;
    }
    const rangeError = validateGoalWeightKg(goalWeightKg, profile.weightUnit);
    if (rangeError) {
      return rangeError;
    }
    // The reached case gets the friendly card above instead of an error.
    if (!formGoalReached || storedGoalReached) {
      return null;
    }
    return goalType === 'lose'
      ? 'Goal weight should be less than your current weight.'
      : 'Goal weight should be more than your current weight.';
  })();

  const livePreview =
    goalType !== 'maintain' &&
    goalWeightKg > 0 &&
    !formGoalReached &&
    isCalorieAdjustmentValid(
      goalType,
      adjustmentInput,
      profile.maintenanceCalories,
      profile.gender,
    )
      ? resolveAdjustmentPreview({
          goalType,
          magnitude: Math.abs(parseFloat(adjustmentInput) || 0),
          maintenanceCalories: profile.maintenanceCalories,
          gender: profile.gender,
          currentWeightKg: profile.weightKg,
          goalWeightKg,
          weightUnit: profile.weightUnit,
        })
      : null;

  return (
    <Screen edges={[]}>
      <KeyboardAwareScreen contentContainerStyle={styles.container}>
        {storedGoalReached && goalType !== 'maintain' && formGoalReached ? (
          <View style={styles.reachedCard}>
            <Text style={styles.reachedTitle}>You’ve reached your goal</Text>
            <Text style={styles.reachedText}>
              Nice work! Your target is now set to maintenance. Enter a new
              goal weight below, or switch to maintaining your weight.
            </Text>
            <Button
              title="Switch to maintain"
              variant="secondary"
              onPress={() => persistGoals(false, 'maintain')}
              style={styles.reachedBtn}
            />
          </View>
        ) : null}

        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Current daily target</Text>
          <Text style={styles.summaryValue}>
            {(livePreview?.dailyTargetCalories ?? profile.dailyTargetCalories).toLocaleString()}{' '}
            kcal/day
          </Text>
          <Text style={styles.summarySub}>
            Maintenance {profile.maintenanceCalories.toLocaleString()} kcal
          </Text>
        </View>

        <Text style={styles.sectionLabel}>Goal</Text>
        <View style={styles.optionList}>
          {GOAL_OPTIONS.map(option => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.option,
                goalType === option.value && styles.optionSelected,
              ]}
              onPress={() => handleGoalTypeChange(option.value)}>
              <Text
                style={[
                  styles.optionText,
                  goalType === option.value && styles.optionTextSelected,
                ]}>
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {goalType !== 'maintain' && (
          <>
            <LabeledInput
              label="Goal weight"
              value={goalWeight}
              onChangeText={setGoalWeight}
              keyboardType="numeric"
              suffix={profile.weightUnit}
              error={goalWeightHint}
            />

            {!formGoalReached && (
              <CalorieAdjustmentField
                goalType={goalType}
                gender={profile.gender}
                maintenanceCalories={profile.maintenanceCalories}
                currentWeightKg={profile.weightKg}
                goalWeightKg={goalWeightKg}
                weightUnit={profile.weightUnit}
                value={adjustmentInput}
                onChangeText={handleAdjustmentChange}
                variant="profile"
              />
            )}
          </>
        )}

        <Button
          title="Save changes"
          onPress={handleSave}
          disabled={
            goalType !== 'maintain' &&
            !formGoalReached &&
            !isCalorieAdjustmentValid(
              goalType,
              adjustmentInput,
              profile.maintenanceCalories,
              profile.gender,
            )
          }
          style={styles.saveBtn}
        />
      </KeyboardAwareScreen>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.lg,
    paddingBottom: spacing.xl,
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    ...typography.body,
    color: colors.stone,
  },
  summaryCard: {
    backgroundColor: colors.noriMute,
    borderRadius: radii.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
    alignItems: 'center',
  },
  summaryLabel: {
    ...typography.caption,
    color: colors.stone,
    marginBottom: spacing.xs,
  },
  summaryValue: {
    fontFamily: fonts.displayBold,
    fontSize: 24,
    lineHeight: 30,
    color: colors.nori,
  },
  summarySub: {
    ...typography.caption,
    color: colors.stone,
    marginTop: spacing.xs,
  },
  sectionLabel: {
    ...typography.label,
    color: colors.ink,
    marginBottom: spacing.sm,
  },
  optionList: {
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  option: {
    padding: spacing.md,
    borderRadius: radii.sm + 2,
    backgroundColor: colors.porcelain,
    borderWidth: 1,
    borderColor: colors.line,
  },
  optionSelected: {
    borderColor: colors.nori,
    backgroundColor: colors.noriMute,
  },
  optionText: {
    ...typography.bodyMedium,
    color: colors.ink,
  },
  optionTextSelected: {
    color: colors.nori,
    fontFamily: fonts.bodySemiBold,
  },
  saveBtn: {
    marginTop: spacing.md,
  },
  reachedCard: {
    backgroundColor: colors.noriMute,
    borderRadius: radii.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  reachedTitle: {
    ...typography.label,
    color: colors.nori,
    marginBottom: spacing.xs,
  },
  reachedText: {
    ...typography.caption,
    color: colors.ink,
  },
  reachedBtn: {
    marginTop: spacing.sm,
  },
});
