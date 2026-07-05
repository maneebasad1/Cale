import React, { useCallback, useState } from 'react';
import {
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Button } from '../../components/Button';
import { KeyboardAwareScreen } from '../../components/KeyboardAwareScreen';
import { LabeledInput } from '../../components/LabeledInput';
import { Screen } from '../../components/Screen';
import { UnitToggle } from '../../components/UnitToggle';
import { colors, spacing } from '../../constants/theme';
import { getProfile, saveProfile } from '../../services/storage';
import {
  DEFAULT_REMINDER_MINUTES,
  minutesToLabel,
  syncDailyReminder,
} from '../../services/notificationService';
import {
  deleteWeightEntry,
  getWeightEntries,
} from '../../services/weightService';
import type { WeightEntry } from '../../types/weight';
import { displayWeight } from '../../utils/units';
import type {
  ActivityLevel,
  Gender,
  GoalType,
  HeightUnit,
  UserProfile,
  WeightUnit,
} from '../../types';
import { ACTIVITY_LEVELS, GOAL_OPTIONS } from '../../types';
import {
  calculateMaintenance,
  resolveProfileTargets,
} from '../../utils/bmr';
import {
  cmToFeetInches,
  feetInchesToCm,
  kgToLb,
  lbToKg,
} from '../../utils/units';

export function SettingsScreen() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [weightUnit, setWeightUnit] = useState<WeightUnit>('kg');
  const [heightUnit, setHeightUnit] = useState<HeightUnit>('cm');
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [heightFeet, setHeightFeet] = useState('');
  const [heightInches, setHeightInches] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState<Gender>('male');
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>('sedentary');
  const [goalType, setGoalType] = useState<GoalType>('lose');
  const [goalWeight, setGoalWeight] = useState('');
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderTimeMinutes, setReminderTimeMinutes] = useState(
    DEFAULT_REMINDER_MINUTES,
  );
  const [weightEntries, setWeightEntries] = useState<WeightEntry[]>([]);
  const [saving, setSaving] = useState(false);

  const loadProfile = useCallback(async () => {
    const p = await getProfile();
    if (!p) {
      return;
    }
    setProfile(p);
    setWeightUnit(p.weightUnit);
    setHeightUnit(p.heightUnit);
    setWeight(
      String(
        Math.round(
          (p.weightUnit === 'kg' ? p.weightKg : kgToLb(p.weightKg)) * 10,
        ) / 10,
      ),
    );
    if (p.heightUnit === 'cm') {
      setHeight(String(Math.round(p.heightCm)));
    } else {
      const { feet, inches } = cmToFeetInches(p.heightCm);
      setHeightFeet(String(feet));
      setHeightInches(String(inches));
    }
    setAge(String(p.age));
    setGender(p.gender);
    setActivityLevel(p.activityLevel);
    setGoalType(p.goalType ?? 'lose');
    setReminderEnabled(p.reminderEnabled ?? false);
    setReminderTimeMinutes(p.reminderTimeMinutes ?? DEFAULT_REMINDER_MINUTES);
    setGoalWeight(
      String(
        Math.round(
          (p.weightUnit === 'kg'
            ? p.goalWeightKg
            : kgToLb(p.goalWeightKg)) * 10,
        ) / 10,
      ),
    );
    const entries = await getWeightEntries();
    setWeightEntries(entries);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, [loadProfile]),
  );

  const handleSave = async () => {
    const weightNum = parseFloat(weight);
    const ageNum = parseInt(age, 10);

    let heightCm: number;
    if (heightUnit === 'cm') {
      heightCm = parseFloat(height);
    } else {
      heightCm = feetInchesToCm(
        parseInt(heightFeet, 10) || 0,
        parseInt(heightInches, 10) || 0,
      );
    }

    if (!weightNum || !heightCm || !ageNum) {
      Alert.alert('Invalid input', 'Please fill in all fields with valid values.');
      return;
    }

    const weightKg = weightUnit === 'kg' ? weightNum : lbToKg(weightNum);
    const goalWeightNum = parseFloat(goalWeight);
    const goalWeightKg =
      goalType === 'maintain'
        ? weightKg
        : weightUnit === 'kg'
          ? goalWeightNum
          : lbToKg(goalWeightNum);

    if (goalType !== 'maintain' && !goalWeightNum) {
      Alert.alert('Invalid input', 'Please enter a valid goal weight.');
      return;
    }

    if (goalType === 'lose' && goalWeightKg >= weightKg) {
      Alert.alert('Invalid goal', 'Goal weight must be less than current weight.');
      return;
    }

    if (goalType === 'gain' && goalWeightKg <= weightKg) {
      Alert.alert('Invalid goal', 'Goal weight must be more than current weight.');
      return;
    }

    const maintenanceCalories = calculateMaintenance(
      weightKg,
      heightCm,
      ageNum,
      gender,
      activityLevel,
    );
    const { calorieAdjustment, dailyTargetCalories } = resolveProfileTargets(
      maintenanceCalories,
      goalType,
      weightKg,
      goalWeightKg,
      gender,
    );

    setSaving(true);
    try {
      const updated: UserProfile = {
        weightKg,
        heightCm,
        age: ageNum,
        gender,
        activityLevel,
        maintenanceCalories,
        goalType,
        goalWeightKg,
        calorieAdjustment,
        dailyTargetCalories,
        weightUnit,
        heightUnit,
        onboardingComplete: true,
        reminderEnabled,
        reminderTimeMinutes,
        lastWeightPromptDate: profile?.lastWeightPromptDate,
      };
      await saveProfile(updated);
      await syncDailyReminder(updated);
      setProfile(updated);
      const targetMessage =
        goalType === 'maintain'
          ? `Your daily target is now ${dailyTargetCalories.toLocaleString()} kcal/day (maintenance).`
          : `Your daily target is now ${dailyTargetCalories.toLocaleString()} kcal/day (${Math.abs(calorieAdjustment)} kcal ${goalType === 'lose' ? 'deficit' : 'surplus'}).`;
      Alert.alert('Profile Updated', targetMessage);
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
        <View style={styles.currentCard}>
          <Text style={styles.currentLabel}>Daily target</Text>
          <Text style={styles.currentValue}>
            {profile.dailyTargetCalories.toLocaleString()} kcal/day
          </Text>
          <Text style={styles.currentSub}>
            {profile.goalType === 'maintain'
              ? `Maintenance target · ${profile.maintenanceCalories.toLocaleString()} kcal`
              : `${Math.abs(profile.calorieAdjustment)} kcal ${profile.goalType === 'lose' ? 'deficit' : 'surplus'} · Maintenance ${profile.maintenanceCalories.toLocaleString()}`}
          </Text>
        </View>

        <Text style={styles.sectionLabel}>Weight</Text>
        <UnitToggle
          options={[
            { value: 'kg' as WeightUnit, label: 'kg' },
            { value: 'lb' as WeightUnit, label: 'lb' },
          ]}
          value={weightUnit}
          onChange={unit => {
            if (weight) {
              const num = parseFloat(weight);
              if (!isNaN(num)) {
                setWeight(
                  String(
                    Math.round(
                      (unit === 'kg' ? lbToKg(num) : kgToLb(num)) * 10,
                    ) / 10,
                  ),
                );
              }
            }
            setWeightUnit(unit);
          }}
          style={styles.toggle}
        />
        <LabeledInput
          label=""
          value={weight}
          onChangeText={setWeight}
          keyboardType="numeric"
          suffix={weightUnit}
        />

        <Text style={styles.sectionLabel}>Height</Text>
        <UnitToggle
          options={[
            { value: 'cm' as HeightUnit, label: 'cm' },
            { value: 'ft_in' as HeightUnit, label: 'ft/in' },
          ]}
          value={heightUnit}
          onChange={unit => {
            if (unit === 'ft_in' && height) {
              const cm = parseFloat(height);
              if (!isNaN(cm)) {
                const { feet, inches } = cmToFeetInches(cm);
                setHeightFeet(String(feet));
                setHeightInches(String(inches));
              }
            } else if (unit === 'cm' && (heightFeet || heightInches)) {
              const cm = feetInchesToCm(
                parseInt(heightFeet, 10) || 0,
                parseInt(heightInches, 10) || 0,
              );
              setHeight(String(Math.round(cm)));
            }
            setHeightUnit(unit);
          }}
          style={styles.toggle}
        />
        {heightUnit === 'cm' ? (
          <LabeledInput
            label=""
            value={height}
            onChangeText={setHeight}
            keyboardType="numeric"
            suffix="cm"
          />
        ) : (
          <View style={styles.heightRow}>
            <View style={styles.heightField}>
              <LabeledInput
                label=""
                value={heightFeet}
                onChangeText={setHeightFeet}
                keyboardType="number-pad"
                suffix="ft"
              />
            </View>
            <View style={styles.heightField}>
              <LabeledInput
                label=""
                value={heightInches}
                onChangeText={setHeightInches}
                keyboardType="number-pad"
                suffix="in"
              />
            </View>
          </View>
        )}

        <LabeledInput
          label="Age"
          value={age}
          onChangeText={setAge}
          keyboardType="number-pad"
          suffix="years"
        />

        <Text style={styles.sectionLabel}>Gender</Text>
        <View style={styles.genderRow}>
          {(['male', 'female'] as Gender[]).map(g => (
            <TouchableOpacity
              key={g}
              style={[styles.genderBtn, gender === g && styles.genderSelected]}
              onPress={() => setGender(g)}>
              <Text
                style={[
                  styles.genderText,
                  gender === g && styles.genderTextSelected,
                ]}>
                {g === 'male' ? 'Male' : 'Female'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.sectionLabel}>Goal</Text>
        <View style={styles.goalList}>
          {GOAL_OPTIONS.map(option => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.activityOption,
                goalType === option.value && styles.activitySelected,
              ]}
              onPress={() => setGoalType(option.value)}>
              <Text
                style={[
                  styles.activityLabel,
                  goalType === option.value && styles.activityLabelSelected,
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
            suffix={weightUnit}
          />
        )}

        <Text style={styles.sectionLabel}>Reminders</Text>
        <TouchableOpacity
          style={[styles.activityOption, reminderEnabled && styles.activitySelected]}
          onPress={() => setReminderEnabled(current => !current)}>
          <Text
            style={[
              styles.activityLabel,
              reminderEnabled && styles.activityLabelSelected,
            ]}>
            Remind me to log my meals
          </Text>
        </TouchableOpacity>
        {reminderEnabled && (
          <View style={styles.reminderTimes}>
            {[18 * 60, 19 * 60, 20 * 60, 21 * 60].map(minutes => (
              <TouchableOpacity
                key={minutes}
                style={[
                  styles.reminderChip,
                  reminderTimeMinutes === minutes && styles.reminderChipActive,
                ]}
                onPress={() => setReminderTimeMinutes(minutes)}>
                <Text
                  style={[
                    styles.reminderChipText,
                    reminderTimeMinutes === minutes &&
                      styles.reminderChipTextActive,
                  ]}>
                  {minutesToLabel(minutes)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {weightEntries.length > 0 && (
          <>
            <Text style={styles.sectionLabel}>Weight trend</Text>
            <View style={styles.weightList}>
              {weightEntries.slice(0, 8).map(entry => (
                <View key={entry.id} style={styles.weightRow}>
                  <Text style={styles.weightDate}>{entry.date}</Text>
                  <Text style={styles.weightValue}>
                    {displayWeight(entry.weightKg, weightUnit)}
                  </Text>
                  <TouchableOpacity
                    onPress={() =>
                      deleteWeightEntry(entry.id).then(loadProfile)
                    }>
                    <Text style={styles.weightDelete}>Delete</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </>
        )}

        <Text style={styles.sectionLabel}>Activity Level</Text>
        <View style={styles.activityList}>
          {ACTIVITY_LEVELS.map(level => {
            const selected = activityLevel === level.value;
            return (
              <TouchableOpacity
                key={level.value}
                style={[styles.activityOption, selected && styles.activitySelected]}
                onPress={() => setActivityLevel(level.value)}>
                <Text
                  style={[
                    styles.activityLabel,
                    selected && styles.activityLabelSelected,
                  ]}>
                  {level.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Button
          title="Save Changes"
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
  currentCard: {
    backgroundColor: colors.chipBg,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.lg,
    alignItems: 'center',
  },
  currentLabel: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  currentValue: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.primary,
  },
  currentSub: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.sm,
    marginTop: spacing.sm,
  },
  toggle: {
    marginBottom: spacing.sm,
  },
  heightRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  heightField: {
    flex: 1,
  },
  genderRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  genderBtn: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
  },
  genderSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.chipBg,
  },
  genderText: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  genderTextSelected: {
    color: colors.primary,
    fontWeight: '600',
  },
  activityList: {
    gap: spacing.xs,
    marginBottom: spacing.lg,
  },
  activityOption: {
    padding: spacing.md,
    borderRadius: 10,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  activitySelected: {
    borderColor: colors.primary,
    backgroundColor: colors.chipBg,
  },
  activityLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.text,
  },
  activityLabelSelected: {
    color: colors.primary,
    fontWeight: '600',
  },
  saveBtn: {
    marginTop: spacing.md,
  },
  goalList: {
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  reminderTimes: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  reminderChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  reminderChipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.chipBg,
  },
  reminderChipText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  reminderChipTextActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  weightList: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  weightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  weightDate: {
    flex: 1,
    fontSize: 14,
    color: colors.textSecondary,
  },
  weightValue: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    marginRight: spacing.md,
  },
  weightDelete: {
    fontSize: 13,
    color: colors.error,
  },
});
