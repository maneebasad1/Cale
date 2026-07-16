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
import { kgToLb, lbToKg } from '../../utils/units';

export function ProfileGoalsScreen() {
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
    setGoalWeight(
      String(
        Math.round(
          (p.weightUnit === 'kg'
            ? p.goalWeightKg
            : kgToLb(p.goalWeightKg)) * 10,
        ) / 10,
      ),
    );
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
    const num = parseFloat(goalWeight);
    if (!num || !profile) {
      return 0;
    }
    return goalType === 'maintain'
      ? profile.weightKg
      : profile.weightUnit === 'kg'
        ? num
        : lbToKg(num);
  }, [goalType, goalWeight, profile]);

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

  const persistGoals = async (useAutoAdjustment: boolean) => {
    if (!profile) {
      return;
    }

    const magnitude = Math.abs(parseFloat(adjustmentInput) || 0);
    const calorieAdjustment =
      goalType === 'maintain'
        ? 0
        : useAutoAdjustment
          ? signedAdjustment(goalType, autoMagnitude)
          : signedAdjustment(goalType, magnitude);

    const updated = buildUpdatedProfile(profile, {
      goalType,
      goalWeightKg,
      calorieAdjustment,
      adjustmentIsCustom:
        goalType !== 'maintain' && !useAutoAdjustment && adjustmentIsCustom,
    });
    await saveProfile(updated);
    setProfile(updated);
    setAdjustmentIsCustom(Boolean(updated.adjustmentIsCustom));
    const targetMessage =
      goalType === 'maintain'
        ? `Your daily target is now ${updated.dailyTargetCalories.toLocaleString()} kcal/day (maintenance).`
        : `Your daily target is now ${updated.dailyTargetCalories.toLocaleString()} kcal/day (${Math.abs(updated.calorieAdjustment)} kcal ${goalType === 'lose' ? 'deficit' : 'surplus'}).`;
    Alert.alert('Goals updated', targetMessage);
  };

  const handleSave = async () => {
    if (!profile) {
      return;
    }

    const goalWeightNum = parseFloat(goalWeight);

    if (goalType !== 'maintain' && !goalWeightNum) {
      Alert.alert('Check your goal', 'Enter a valid goal weight.');
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

  const livePreview =
    goalType !== 'maintain' &&
    goalWeightKg > 0 &&
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
            />

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
          </>
        )}

        <Button
          title="Save changes"
          onPress={handleSave}
          disabled={
            goalType !== 'maintain' &&
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
});
