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
import type { WorkoutReminderSetting } from '../../types';
import { Icon } from '../Icon';
import { colors, fonts, radii, spacing, typography } from '../../constants/theme';
import {
  dateFromMinutes,
  minutesFromDate,
  minutesToLabel,
} from '../../services/notificationService';

interface WorkoutReminderCardProps {
  setting: WorkoutReminderSetting;
  showPicker: boolean;
  onToggle: () => void;
  onOpenPicker: () => void;
  onTimeChange: (minutes: number) => void;
  onPickerDismiss: () => void;
}

export function WorkoutReminderCard({
  setting,
  showPicker,
  onToggle,
  onOpenPicker,
  onTimeChange,
  onPickerDismiss,
}: WorkoutReminderCardProps) {
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
        <View style={[styles.iconWrap, isActive && styles.iconWrapActive]}>
          <Icon
            name="fitness-outline"
            size={18}
            color={isActive ? colors.nori : colors.stone}
          />
        </View>
        <View style={styles.headerText}>
          <Text style={[styles.title, isActive && styles.titleActive]}>
            Workout
          </Text>
          <Text style={styles.subtitle}>
            {isActive
              ? `Reminder at ${minutesToLabel(setting.timeMinutes)}`
              : 'Tap to turn on'}
          </Text>
        </View>
        <View style={[styles.toggle, isActive && styles.toggleActive]}>
          <View style={[styles.knob, isActive && styles.knobActive]} />
        </View>
      </TouchableOpacity>

      {isActive ? (
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
              {showPicker ? (
                <DateTimePicker
                  value={reminderDate}
                  mode="time"
                  is24Hour={false}
                  onChange={handleTimeChange}
                />
              ) : null}
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
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.porcelain,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.line,
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  cardActive: {
    borderColor: colors.nori,
    backgroundColor: colors.noriMute,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: radii.sm + 2,
    backgroundColor: colors.steam,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  iconWrapActive: {
    backgroundColor: colors.porcelain,
  },
  headerText: {
    flex: 1,
    marginRight: spacing.md,
  },
  title: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 16,
    lineHeight: 22,
    color: colors.ink,
  },
  titleActive: {
    color: colors.nori,
  },
  subtitle: {
    ...typography.caption,
    color: colors.stone,
    marginTop: 2,
  },
  toggle: {
    width: 48,
    height: 28,
    borderRadius: radii.pill,
    backgroundColor: colors.line,
    padding: 2,
    justifyContent: 'center',
  },
  toggleActive: {
    backgroundColor: colors.nori,
  },
  knob: {
    width: 24,
    height: 24,
    borderRadius: radii.full,
    backgroundColor: colors.porcelain,
    alignSelf: 'flex-start',
  },
  knobActive: {
    alignSelf: 'flex-end',
  },
  timeButton: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.line,
    paddingVertical: spacing.md,
    alignItems: 'center',
    backgroundColor: colors.porcelain,
  },
  timeButtonValue: {
    fontFamily: fonts.displayBold,
    fontSize: 22,
    color: colors.nori,
  },
  iosPickerWrap: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.line,
    backgroundColor: colors.porcelain,
  },
  iosPicker: {
    height: 150,
  },
});
