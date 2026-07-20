import React, { useCallback, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Button } from '../../components/Button';
import { MealReminderCard } from '../../components/profile/MealReminderCard';
import { WorkoutReminderCard } from '../../components/profile/WorkoutReminderCard';
import { Screen } from '../../components/Screen';
import { colors, spacing, typography } from '../../constants/theme';
import {
  formatMealRemindersSummary,
  formatWorkoutReminderSummary,
  sendTestNotification,
  sendTestWorkoutNotification,
  syncDailyReminder,
} from '../../services/notificationService';
import { getProfile, saveProfile } from '../../services/storage';
import type {
  MealReminderMeal,
  MealReminders,
  UserProfile,
  WorkoutReminderSetting,
} from '../../types';
import {
  DEFAULT_MEAL_REMINDERS,
  DEFAULT_WORKOUT_REMINDER,
  MEAL_REMINDER_MEALS,
} from '../../types';
import {
  isAnyMealReminderEnabled,
  resolveMealReminders,
} from '../../utils/mealReminders';
import { resolveWorkoutReminder } from '../../utils/workoutReminders';

export function ProfileNotificationsScreen() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [mealReminders, setMealReminders] = useState<MealReminders>(
    DEFAULT_MEAL_REMINDERS,
  );
  const [workoutReminder, setWorkoutReminder] = useState<WorkoutReminderSetting>(
    DEFAULT_WORKOUT_REMINDER,
  );
  const [activePickerMeal, setActivePickerMeal] =
    useState<MealReminderMeal | null>(null);
  const [showWorkoutPicker, setShowWorkoutPicker] = useState(false);
  const [testingMeal, setTestingMeal] = useState(false);
  const [testingWorkout, setTestingWorkout] = useState(false);

  const loadProfile = useCallback(async () => {
    const p = await getProfile();
    if (!p) {
      return;
    }
    setProfile(p);
    setMealReminders(resolveMealReminders(p));
    setWorkoutReminder(resolveWorkoutReminder(p));
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, [loadProfile]),
  );

  const updateMealSetting = (
    meal: MealReminderMeal,
    updates: Partial<MealReminders[MealReminderMeal]>,
  ) => {
    setMealReminders(current => ({
      ...current,
      [meal]: { ...current[meal], ...updates },
    }));
  };

  const handleSave = async () => {
    if (!profile) {
      return;
    }

    const updated: UserProfile = {
      ...profile,
      mealReminders,
      workoutReminder,
      reminderEnabled:
        MEAL_REMINDER_MEALS.some(meal => mealReminders[meal].enabled) ||
        workoutReminder.enabled,
    };
    await saveProfile(updated);
    await syncDailyReminder(updated);
    setProfile(updated);

    const mealSummary = isAnyMealReminderEnabled(updated)
      ? formatMealRemindersSummary(mealReminders)
      : 'Meal reminders off';
    const workoutSummary = formatWorkoutReminderSummary(workoutReminder);

    Alert.alert('Notifications updated', `${mealSummary}\n${workoutSummary}`);
  };

  const handleTestMealNotification = async () => {
    const testMeal =
      MEAL_REMINDER_MEALS.find(meal => mealReminders[meal].enabled) ??
      'breakfast';

    setTestingMeal(true);
    try {
      const { error } = await sendTestNotification(testMeal);
      if (error) {
        Alert.alert('Test failed', error);
        return;
      }
      Alert.alert(
        'Test sent',
        'Check your notification tray — you should see a sample meal reminder.',
      );
    } finally {
      setTestingMeal(false);
    }
  };

  const handleTestWorkoutNotification = async () => {
    setTestingWorkout(true);
    try {
      const { error } = await sendTestWorkoutNotification();
      if (error) {
        Alert.alert('Test failed', error);
        return;
      }
      Alert.alert(
        'Test sent',
        'Check your notification tray — you should see a sample workout reminder.',
      );
    } finally {
      setTestingWorkout(false);
    }
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
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionLabel}>Meal reminders</Text>
        <Text style={styles.hint}>
          Turn on the meals you want reminders for and set a time for each.
          Reminders stop once you log that meal for the day.
        </Text>

        {MEAL_REMINDER_MEALS.map(meal => (
          <MealReminderCard
            key={meal}
            meal={meal}
            setting={mealReminders[meal]}
            showPicker={activePickerMeal === meal}
            onToggle={() =>
              updateMealSetting(meal, {
                enabled: !mealReminders[meal].enabled,
              })
            }
            onOpenPicker={() => setActivePickerMeal(meal)}
            onTimeChange={minutes => updateMealSetting(meal, { timeMinutes: minutes })}
            onPickerDismiss={() => setActivePickerMeal(null)}
          />
        ))}

        <Text style={[styles.sectionLabel, styles.sectionSpaced]}>
          Workout reminder
        </Text>
        <Text style={styles.hint}>
          Get a daily nudge to log workout calories. The reminder stops once you
          log a workout for the day.
        </Text>

        <WorkoutReminderCard
          setting={workoutReminder}
          showPicker={showWorkoutPicker}
          onToggle={() =>
            setWorkoutReminder(current => ({
              ...current,
              enabled: !current.enabled,
            }))
          }
          onOpenPicker={() => setShowWorkoutPicker(true)}
          onTimeChange={minutes =>
            setWorkoutReminder(current => ({ ...current, timeMinutes: minutes }))
          }
          onPickerDismiss={() => setShowWorkoutPicker(false)}
        />

        <Button
          title="Save changes"
          onPress={handleSave}
          style={styles.saveBtn}
        />

        <View style={styles.testSection}>
          <Text style={styles.testTitle}>Test notifications</Text>
          <Text style={styles.testHint}>
            Send a one-time sample to confirm notifications work on this device.
          </Text>
          <Button
            title="Send meal test"
            variant="secondary"
            onPress={handleTestMealNotification}
            loading={testingMeal}
            style={styles.testBtn}
          />
          <Button
            title="Send workout test"
            variant="secondary"
            onPress={handleTestWorkoutNotification}
            loading={testingWorkout}
          />
        </View>
      </ScrollView>
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
  },
  sectionSpaced: {
    marginTop: spacing.lg,
  },
  hint: {
    ...typography.caption,
    color: colors.stone,
    marginBottom: spacing.md,
  },
  saveBtn: {
    marginTop: spacing.lg,
  },
  testSection: {
    marginTop: spacing.xl,
    paddingTop: spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.line,
  },
  testTitle: {
    ...typography.label,
    color: colors.ink,
    marginBottom: spacing.xs,
  },
  testHint: {
    ...typography.caption,
    color: colors.stone,
    marginBottom: spacing.md,
  },
  testBtn: {
    marginBottom: spacing.sm,
  },
});
