import React, { useCallback, useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Button } from '../../components/Button';
import { KeyboardAwareScreen } from '../../components/KeyboardAwareScreen';
import { LabeledInput } from '../../components/LabeledInput';
import { Screen } from '../../components/Screen';
import { colors, fonts, radii, spacing, typography } from '../../constants/theme';
import { getProfile, saveProfile } from '../../services/storage';
import type { GoalType, UserProfile } from '../../types';
import { GOAL_OPTIONS } from '../../types';
import { buildUpdatedProfile } from '../../utils/profileSave';
import { kgToLb, lbToKg } from '../../utils/units';

export function ProfileGoalsScreen() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [goalType, setGoalType] = useState<GoalType>('lose');
  const [goalWeight, setGoalWeight] = useState('');

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
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, [loadProfile]),
  );

  const handleSave = async () => {
    if (!profile) {
      return;
    }

    const goalWeightNum = parseFloat(goalWeight);
    const goalWeightKg =
      goalType === 'maintain'
        ? profile.weightKg
        : profile.weightUnit === 'kg'
          ? goalWeightNum
          : lbToKg(goalWeightNum);

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

    const updated = buildUpdatedProfile(profile, {
      goalType,
      goalWeightKg,
    });
    await saveProfile(updated);
    setProfile(updated);
    const targetMessage =
      goalType === 'maintain'
        ? `Your daily target is now ${updated.dailyTargetCalories.toLocaleString()} kcal/day (maintenance).`
        : `Your daily target is now ${updated.dailyTargetCalories.toLocaleString()} kcal/day (${Math.abs(updated.calorieAdjustment)} kcal ${goalType === 'lose' ? 'deficit' : 'surplus'}).`;
    Alert.alert('Goals updated', targetMessage);
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

  return (
    <Screen edges={[]}>
      <KeyboardAwareScreen contentContainerStyle={styles.container}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Current daily target</Text>
          <Text style={styles.summaryValue}>
            {profile.dailyTargetCalories.toLocaleString()} kcal/day
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
              onPress={() => setGoalType(option.value)}>
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
          <LabeledInput
            label="Goal weight"
            value={goalWeight}
            onChangeText={setGoalWeight}
            keyboardType="numeric"
            suffix={profile.weightUnit}
          />
        )}

        <Button
          title="Save changes"
          onPress={handleSave}
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
