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
import { colors, fonts, radii, spacing, typography } from '../../constants/theme';
import { getProfile, saveProfile } from '../../services/storage';
import type {
  ActivityLevel,
  Gender,
  HeightUnit,
  UserProfile,
  WeightUnit,
} from '../../types';
import { ACTIVITY_LEVELS } from '../../types';
import { calculateMaintenance } from '../../utils/bmr';
import { validateMaintenanceCalories } from '../../utils/maintenanceValidation';
import { buildUpdatedProfile } from '../../utils/profileSave';
import {
  promptCustomAdjustmentUpdate,
  shouldPromptCustomAdjustmentUpdate,
} from '../../utils/profileAdjustmentPrompt';
import {
  cmToFeetInches,
  feetInchesToCm,
  kgToLb,
  lbToKg,
} from '../../utils/units';

export function ProfileBodyScreen() {
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
  const [maintenanceIsCustom, setMaintenanceIsCustom] = useState(false);
  const [maintenanceInput, setMaintenanceInput] = useState('');
  const [maintenanceError, setMaintenanceError] = useState<string | null>(null);

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
    setMaintenanceIsCustom(Boolean(p.maintenanceIsCustom));
    setMaintenanceInput(String(p.maintenanceCalories));
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
      Alert.alert('Check your details', 'Fill in every field with a valid value.');
      return;
    }

    const weightKg = weightUnit === 'kg' ? weightNum : lbToKg(weightNum);

    let maintenanceCalories: number | undefined;
    if (maintenanceIsCustom) {
      const manualMaintenance = parseInt(maintenanceInput, 10);
      const error = validateMaintenanceCalories(manualMaintenance);
      if (error) {
        setMaintenanceError(error);
        Alert.alert('Check maintenance calories', error);
        return;
      }
      maintenanceCalories = manualMaintenance;
      setMaintenanceError(null);
    }

    const applySave = async (useAutoAdjustment: boolean) => {
      const updates = {
        weightKg,
        heightCm,
        age: ageNum,
        gender,
        activityLevel,
        weightUnit,
        heightUnit,
        maintenanceIsCustom,
        ...(maintenanceCalories !== undefined
          ? { maintenanceCalories }
          : {}),
        ...(useAutoAdjustment ? { adjustmentIsCustom: false } : {}),
      };
      const updated = buildUpdatedProfile(profile, updates);
      await saveProfile(updated);
      setProfile(updated);
      Alert.alert(
        'Settings saved',
        `Your daily target is now ${updated.dailyTargetCalories.toLocaleString()} kcal/day.`,
      );
    };

    if (shouldPromptCustomAdjustmentUpdate(profile, { weightKg })) {
      promptCustomAdjustmentUpdate(profile, { weightKg }, useAuto =>
        applySave(useAuto),
      );
      return;
    }

    await applySave(false);
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

  const autoMaintenance = calculateMaintenance(
    profile.weightUnit === 'kg'
      ? parseFloat(weight) || profile.weightKg
      : lbToKg(parseFloat(weight) || kgToLb(profile.weightKg)),
    heightUnit === 'cm'
      ? parseFloat(height) || profile.heightCm
      : feetInchesToCm(
          parseInt(heightFeet, 10) || 0,
          parseInt(heightInches, 10) || 0,
        ) || profile.heightCm,
    parseInt(age, 10) || profile.age,
    gender,
    activityLevel,
  );

  return (
    <Screen edges={[]}>
      <KeyboardAwareScreen contentContainerStyle={styles.container}>
        <Text style={styles.sectionLabel}>Maintenance calories</Text>
        <UnitToggle
          options={[
            { value: 'auto' as const, label: 'Auto-calculate' },
            { value: 'manual' as const, label: 'Set manually' },
          ]}
          value={maintenanceIsCustom ? 'manual' : 'auto'}
          onChange={mode => {
            const manual = mode === 'manual';
            setMaintenanceIsCustom(manual);
            if (manual && !maintenanceInput) {
              setMaintenanceInput(String(Math.round(autoMaintenance)));
            }
            setMaintenanceError(null);
          }}
          style={styles.toggle}
        />
        {maintenanceIsCustom ? (
          <>
            <LabeledInput
              label="Daily maintenance"
              value={maintenanceInput}
              onChangeText={text => {
                setMaintenanceInput(text);
                const num = parseInt(text, 10);
                setMaintenanceError(
                  text.trim() ? validateMaintenanceCalories(num) : null,
                );
              }}
              keyboardType="number-pad"
              suffix="kcal/day"
            />
            {maintenanceError ? (
              <Text style={styles.error}>{maintenanceError}</Text>
            ) : null}
          </>
        ) : (
          <Text style={styles.hint}>
            Currently estimated at {Math.round(autoMaintenance).toLocaleString()}{' '}
            kcal/day from your body metrics and activity level.
          </Text>
        )}
        {maintenanceIsCustom ? (
          <Text style={styles.hint}>
            Maintenance calories is set manually — edit it above to change your
            daily target.
          </Text>
        ) : null}

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
              style={[styles.option, gender === g && styles.optionSelected]}
              onPress={() => setGender(g)}>
              <Text
                style={[
                  styles.optionText,
                  gender === g && styles.optionTextSelected,
                ]}>
                {g === 'male' ? 'Male' : 'Female'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.sectionLabel}>Activity level</Text>
        <View style={styles.optionList}>
          {ACTIVITY_LEVELS.map(level => {
            const selected = activityLevel === level.value;
            return (
              <TouchableOpacity
                key={level.value}
                style={[styles.option, selected && styles.optionSelected]}
                onPress={() => setActivityLevel(level.value)}>
                <Text
                  style={[
                    styles.optionText,
                    selected && styles.optionTextSelected,
                  ]}>
                  {level.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

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
  sectionLabel: {
    ...typography.label,
    color: colors.ink,
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
  optionList: {
    gap: spacing.xs,
    marginBottom: spacing.lg,
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
  hint: {
    ...typography.caption,
    color: colors.stone,
    marginBottom: spacing.md,
  },
  error: {
    ...typography.caption,
    color: colors.chili,
    marginTop: -spacing.sm,
    marginBottom: spacing.md,
  },
});
