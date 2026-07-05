import React, { useCallback, useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Button } from '../../components/Button';
import { KeyboardAwareScreen } from '../../components/KeyboardAwareScreen';
import { LabeledInput } from '../../components/LabeledInput';
import { Screen } from '../../components/Screen';
import { colors, spacing } from '../../constants/theme';
import { getProfile, saveProfile } from '../../services/storage';
import type { GoalType, UserProfile } from '../../types';
import { GOAL_OPTIONS } from '../../types';
import { buildUpdatedProfile } from '../../utils/profileSave';
import { kgToLb, lbToKg } from '../../utils/units';

export function ProfileGoalsScreen() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [goalType, setGoalType] = useState<GoalType>('lose');
  const [goalWeight, setGoalWeight] = useState('');
  const [saving, setSaving] = useState(false);

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
      Alert.alert('Invalid input', 'Please enter a valid goal weight.');
      return;
    }

    if (goalType === 'lose' && goalWeightKg >= profile.weightKg) {
      Alert.alert('Invalid goal', 'Goal weight must be less than current weight.');
      return;
    }

    if (goalType === 'gain' && goalWeightKg <= profile.weightKg) {
      Alert.alert('Invalid goal', 'Goal weight must be more than current weight.');
      return;
    }

    setSaving(true);
    try {
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
    } finally {
      setSaving(false);
    }
  };

  if (!profile) {
    return (
      <Screen edges={[]}>
        <View style={styles.loading}>
          <Text style={styles.loadingText}>Loading...</Text>
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
          title="Save goals"
          onPress={handleSave}
          loading={saving}
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
    color: colors.textSecondary,
  },
  summaryCard: {
    backgroundColor: colors.chipBg,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.lg,
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.primary,
  },
  summarySub: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  optionList: {
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  option: {
    padding: spacing.md,
    borderRadius: 10,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  optionSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.chipBg,
  },
  optionText: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.text,
  },
  optionTextSelected: {
    color: colors.primary,
    fontWeight: '600',
  },
  saveBtn: {
    marginTop: spacing.md,
  },
});
