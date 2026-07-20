import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { getWorkoutById, searchWorkouts } from '../../data/workouts';
import { FormSection } from '../../components/onboarding/FormSection';
import { OnboardingFooter } from '../../components/onboarding/OnboardingFooter';
import { KeyboardAwareScreen } from '../../components/KeyboardAwareScreen';
import { LabeledInput } from '../../components/LabeledInput';
import { Screen } from '../../components/Screen';
import { UnitToggle } from '../../components/UnitToggle';
import { colors, fonts, radii, spacing, typography } from '../../constants/theme';
import type { MainStackParamList } from '../../navigation/types';
import { getProfile } from '../../services/storage';
import {
  addWorkoutEntry,
  getWorkoutsForDate,
  updateWorkoutEntry,
} from '../../services/workoutService';
import type { WorkoutEntryMode } from '../../types/workout';
import { calculateWorkoutCalories } from '../../utils/workoutCalories';
import { formatDisplayDate, isToday } from '../../utils/date';

type Nav = NativeStackNavigationProp<MainStackParamList, 'AddWorkout'>;
type Route = RouteProp<MainStackParamList, 'AddWorkout'>;

export function AddWorkoutScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { date, entryId } = route.params;
  const isEditing = Boolean(entryId);

  const [entryMode, setEntryMode] = useState<WorkoutEntryMode>('preset');
  const [query, setQuery] = useState('');
  const [selectedWorkoutId, setSelectedWorkoutId] = useState<string | null>(
    null,
  );
  const [durationMinutes, setDurationMinutes] = useState('');
  const [caloriesBurned, setCaloriesBurned] = useState('');
  const [customName, setCustomName] = useState('');
  const [weightKg, setWeightKg] = useState(70);
  const [loaded, setLoaded] = useState(!entryId);

  const workouts = useMemo(() => searchWorkouts(query), [query]);
  const selectedPreset = selectedWorkoutId
    ? getWorkoutById(selectedWorkoutId)
    : undefined;

  useEffect(() => {
    navigation.setOptions({
      title: isEditing ? 'Edit workout' : 'Log workout',
    });
  }, [navigation, isEditing]);

  useEffect(() => {
    getProfile().then(profile => {
      if (profile?.weightKg) {
        setWeightKg(profile.weightKg);
      }
    });
  }, []);

  useEffect(() => {
    if (!entryId) {
      return;
    }
    getWorkoutsForDate(date).then(entries => {
      const entry = entries.find(item => item.id === entryId);
      if (!entry) {
        setLoaded(true);
        return;
      }
      setEntryMode(entry.entryMode);
      setCaloriesBurned(String(entry.caloriesBurned));
      setCustomName(entry.name);
      if (entry.workoutId) {
        setSelectedWorkoutId(entry.workoutId);
      }
      if (entry.durationMinutes) {
        setDurationMinutes(String(entry.durationMinutes));
      }
      setLoaded(true);
    });
  }, [date, entryId]);

  useEffect(() => {
    if (entryMode !== 'preset' || !selectedPreset) {
      return;
    }
    const minutes = parseInt(durationMinutes, 10);
    if (!minutes || minutes <= 0) {
      return;
    }
    setCaloriesBurned(
      String(
        calculateWorkoutCalories(selectedPreset.met, weightKg, minutes),
      ),
    );
  }, [entryMode, selectedPreset, durationMinutes, weightKg]);

  const handleModeChange = (mode: WorkoutEntryMode) => {
    setEntryMode(mode);
    if (mode === 'custom') {
      setSelectedWorkoutId(null);
    }
  };

  const isValid =
    entryMode === 'preset'
      ? Boolean(selectedWorkoutId) &&
        parseInt(caloriesBurned, 10) > 0 &&
        parseInt(durationMinutes, 10) > 0
      : parseInt(caloriesBurned, 10) > 0;

  const handleSave = useCallback(async () => {
    const burned = parseInt(caloriesBurned, 10);
    if (!burned || burned <= 0) {
      return;
    }

    if (entryMode === 'preset' && !selectedPreset) {
      return;
    }

    const payload = {
      name:
        entryMode === 'preset'
          ? selectedPreset!.name
          : customName.trim() || 'Custom workout',
      caloriesBurned: burned,
      durationMinutes:
        entryMode === 'preset'
          ? parseInt(durationMinutes, 10) || undefined
          : undefined,
      entryMode,
      workoutId: entryMode === 'preset' ? selectedPreset!.id : undefined,
    };

    if (entryId) {
      await updateWorkoutEntry(date, entryId, payload);
    } else {
      await addWorkoutEntry(date, payload);
    }
    navigation.goBack();
  }, [
    caloriesBurned,
    customName,
    date,
    durationMinutes,
    entryId,
    entryMode,
    navigation,
    selectedPreset,
  ]);

  if (!loaded) {
    return (
      <Screen edges={['bottom']}>
        <View style={styles.loading}>
          <Text style={styles.loadingText}>Loading…</Text>
        </View>
      </Screen>
    );
  }

  const dateLabel = isToday(date)
    ? `Today · ${formatDisplayDate(date)}`
    : formatDisplayDate(date);

  return (
    <Screen edges={['bottom']}>
      <KeyboardAwareScreen
        contentContainerStyle={styles.content}
        footer={
          <OnboardingFooter
            title={isEditing ? 'Save changes' : 'Save workout'}
            onPress={handleSave}
            disabled={!isValid}
          />
        }>
        <Text style={styles.dateLabel}>{dateLabel}</Text>

        <FormSection title="How to log">
          <UnitToggle
            options={[
              { value: 'preset' as WorkoutEntryMode, label: 'Pick workout' },
              { value: 'custom' as WorkoutEntryMode, label: 'Custom kcal' },
            ]}
            value={entryMode}
            onChange={handleModeChange}
          />
        </FormSection>

        {entryMode === 'preset' ? (
          <>
            <FormSection title="Search workout">
              <TextInput
                style={styles.searchInput}
                value={query}
                onChangeText={setQuery}
                placeholder="Walking, yoga, HIIT…"
                placeholderTextColor={colors.textSecondary}
              />
              <ScrollView style={styles.workoutList} nestedScrollEnabled>
                {workouts.map(workout => {
                  const selected = selectedWorkoutId === workout.id;
                  return (
                    <TouchableOpacity
                      key={workout.id}
                      style={[
                        styles.workoutRow,
                        selected && styles.workoutRowSelected,
                      ]}
                      onPress={() => setSelectedWorkoutId(workout.id)}>
                      <Text
                        style={[
                          styles.workoutName,
                          selected && styles.workoutNameSelected,
                        ]}>
                        {workout.name}
                      </Text>
                      <Text style={styles.workoutMeta}>
                        {workout.category} · MET {workout.met}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </FormSection>

            <FormSection title="Duration">
              <LabeledInput
                label=""
                value={durationMinutes}
                onChangeText={setDurationMinutes}
                keyboardType="number-pad"
                placeholder="30"
                suffix="min"
              />
            </FormSection>
          </>
        ) : (
          <FormSection title="Workout">
            <LabeledInput
              label="Name (optional)"
              value={customName}
              onChangeText={setCustomName}
              placeholder="What did you do? (optional)"
            />
          </FormSection>
        )}

        <FormSection title="Calories burned">
          <LabeledInput
            label=""
            value={caloriesBurned}
            onChangeText={setCaloriesBurned}
            keyboardType="number-pad"
            placeholder="0"
            suffix="kcal"
          />
          {entryMode === 'preset' && selectedPreset ? (
            <Text style={styles.hint}>
              Estimated from your weight ({Math.round(weightKg)} kg) and MET{' '}
              {selectedPreset.met}. Adjust if needed.
            </Text>
          ) : null}
        </FormSection>
      </KeyboardAwareScreen>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.md,
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  dateLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  searchInput: {
    fontFamily: fonts.body,
    fontSize: 16,
    color: colors.text,
    backgroundColor: colors.surface,
    borderRadius: radii.sm + 2,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    marginBottom: spacing.sm,
  },
  workoutList: {
    maxHeight: 220,
  },
  workoutRow: {
    padding: spacing.md,
    borderRadius: radii.sm + 2,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    marginBottom: spacing.xs,
  },
  workoutRowSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.noriMute,
  },
  workoutName: {
    ...typography.bodyMedium,
    color: colors.text,
  },
  workoutNameSelected: {
    color: colors.primary,
  },
  workoutMeta: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  hint: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
});
