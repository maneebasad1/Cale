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
import { Screen } from '../../components/Screen';
import { colors, spacing, typography } from '../../constants/theme';
import {
  formatMealRemindersSummary,
  sendTestNotification,
  syncDailyReminder,
} from '../../services/notificationService';
import { getProfile, saveProfile } from '../../services/storage';
import type { MealReminderMeal, MealReminders, UserProfile } from '../../types';
import {
  DEFAULT_MEAL_REMINDERS,
  MEAL_REMINDER_MEALS,
} from '../../types';
import {
  isAnyMealReminderEnabled,
  resolveMealReminders,
} from '../../utils/mealReminders';

export function ProfileNotificationsScreen() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [mealReminders, setMealReminders] = useState<MealReminders>(
    DEFAULT_MEAL_REMINDERS,
  );
  const [activePickerMeal, setActivePickerMeal] =
    useState<MealReminderMeal | null>(null);
  const [testing, setTesting] = useState(false);

  const loadProfile = useCallback(async () => {
    const p = await getProfile();
    if (!p) {
      return;
    }
    setProfile(p);
    setMealReminders(resolveMealReminders(p));
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
      reminderEnabled: MEAL_REMINDER_MEALS.some(
        meal => mealReminders[meal].enabled,
      ),
    };
    await saveProfile(updated);
    await syncDailyReminder(updated);
    setProfile(updated);
    Alert.alert(
      'Notifications updated',
      isAnyMealReminderEnabled(updated)
        ? formatMealRemindersSummary(mealReminders)
        : 'Meal reminders turned off.',
    );
  };

  const handleTestNotification = async () => {
    const testMeal =
      MEAL_REMINDER_MEALS.find(meal => mealReminders[meal].enabled) ??
      'breakfast';

    setTesting(true);
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
      setTesting(false);
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

        <Button
          title="Save changes"
          onPress={handleSave}
          style={styles.saveBtn}
        />

        <View style={styles.testSection}>
          <Text style={styles.testTitle}>Test notification</Text>
          <Text style={styles.testHint}>
            Send a one-time sample reminder to confirm notifications work on
            this device.
          </Text>
          <Button
            title="Send test notification"
            variant="secondary"
            onPress={handleTestNotification}
            loading={testing}
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
});
