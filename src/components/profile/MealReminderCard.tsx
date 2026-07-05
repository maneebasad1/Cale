import React from 'react';
import {
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import DateTimePicker, {
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import type { MealReminderMeal, MealReminderSetting } from '../../types';
import { MEAL_LABELS } from '../../types';
import { colors, spacing } from '../../constants/theme';
import {
  dateFromMinutes,
  minutesFromDate,
  minutesToLabel,
} from '../../services/notificationService';

interface MealReminderCardProps {
  meal: MealReminderMeal;
  setting: MealReminderSetting;
  showPicker: boolean;
  onToggle: () => void;
  onOpenPicker: () => void;
  onTimeChange: (minutes: number) => void;
  onPickerDismiss: () => void;
}

export function MealReminderCard({
  meal,
  setting,
  showPicker,
  onToggle,
  onOpenPicker,
  onTimeChange,
  onPickerDismiss,
}: MealReminderCardProps) {
  const reminderDate = dateFromMinutes(setting.timeMinutes);
  const isActive = setting.enabled;

  const handleTimeChange = (event: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === 'android') {
      onPickerDismiss();
    }
    if (selected) {
      onTimeChange(minutesFromDate(selected));
    }
  };

  return (
    <View style={[styles.card, isActive && styles.cardActive]}>
      <TouchableOpacity
        style={styles.header}
        onPress={onToggle}
        activeOpacity={0.7}>
        <View style={styles.headerText}>
          <Text style={[styles.title, isActive && styles.titleActive]}>
            {MEAL_LABELS[meal]}
          </Text>
          <Text style={styles.subtitle}>
            {isActive
              ? `Reminder at ${minutesToLabel(setting.timeMinutes)}`
              : 'Tap to enable'}
          </Text>
        </View>
        <View style={[styles.toggle, isActive && styles.toggleActive]}>
          <View style={[styles.knob, isActive && styles.knobActive]} />
        </View>
      </TouchableOpacity>

      {isActive && (
        <>
          {Platform.OS === 'android' ? (
            <>
              <TouchableOpacity
                style={styles.timeButton}
                onPress={onOpenPicker}
                activeOpacity={0.7}>
                <Text style={styles.timeButtonValue}>
                  {minutesToLabel(setting.timeMinutes)}
                </Text>
              </TouchableOpacity>
              {showPicker && (
                <DateTimePicker
                  value={reminderDate}
                  mode="time"
                  is24Hour={false}
                  onChange={handleTimeChange}
                />
              )}
            </>
          ) : (
            <View style={styles.iosPickerWrap}>
              <DateTimePicker
                value={reminderDate}
                mode="time"
                display="spinner"
                onChange={handleTimeChange}
                style={styles.iosPicker}
              />
            </View>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  cardActive: {
    borderColor: colors.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
  },
  headerText: {
    flex: 1,
    marginRight: spacing.md,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  titleActive: {
    color: colors.primary,
  },
  subtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  toggle: {
    width: 48,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.border,
    padding: 2,
    justifyContent: 'center',
  },
  toggleActive: {
    backgroundColor: colors.primary,
  },
  knob: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.surface,
    alignSelf: 'flex-start',
  },
  knobActive: {
    alignSelf: 'flex-end',
  },
  timeButton: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  timeButtonValue: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.primary,
  },
  iosPickerWrap: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  iosPicker: {
    height: 150,
  },
});
