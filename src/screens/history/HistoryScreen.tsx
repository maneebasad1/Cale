import React, { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Calendar, DateData } from 'react-native-calendars';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { HistorySummaryPanel } from '../../components/history/HistorySummaryPanel';
import { Screen } from '../../components/Screen';
import {
  colors,
  fonts,
  getProgressTone,
  progressColor,
  progressMute,
  radii,
  spacing,
  typography,
} from '../../constants/theme';
import type { HistoryStackParamList } from '../../navigation/types';
import {
  copyDayEntries,
  getAllLogs,
  getDailyLog,
  getProfile,
  getTotalCalories,
} from '../../services/storage';
import { ensureTargetHistorySeeded, getTargetHistory } from '../../services/targetHistoryService';
import type { DailyLog, UserProfile } from '../../types';
import type { TargetSnapshot } from '../../types/targetHistory';
import { getPeriodSummary, getTrailingDates } from '../../utils/calorieStats';
import { getTargetForDate } from '../../utils/targetHistory';
import {
  formatDateKey,
  getMonthStart,
  isFutureDate,
} from '../../utils/date';

type MarkedDates = Record<
  string,
  {
    marked?: boolean;
    dotColor?: string;
    customStyles?: {
      container?: object;
      text?: object;
    };
  }
>;

type HistoryView = 'calendar' | 'summary';
type SummaryPeriod = 'week' | 'month';

export function HistoryScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<HistoryStackParamList>>();
  const today = useMemo(() => formatDateKey(), []);
  const [markedDates, setMarkedDates] = useState<MarkedDates>({});
  const [dayTotals, setDayTotals] = useState<Record<string, number>>({});
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [selectedDate, setSelectedDate] = useState(today);
  const [view, setView] = useState<HistoryView>('calendar');
  const [summaryPeriod, setSummaryPeriod] = useState<SummaryPeriod>('week');
  const [logs, setLogs] = useState<Record<string, DailyLog>>({});
  const [targetSnapshots, setTargetSnapshots] = useState<TargetSnapshot[]>([]);

  const loadData = useCallback(async () => {
    const [allLogs, userProfile, snapshotsRaw] = await Promise.all([
      getAllLogs(),
      getProfile(),
      getTargetHistory(),
    ]);
    const snapshots =
      userProfile && !snapshotsRaw.length
        ? await ensureTargetHistorySeeded(userProfile)
        : snapshotsRaw;
    setProfile(userProfile);
    setLogs(allLogs);
    setTargetSnapshots(snapshots);

    const fallback = userProfile
      ? {
          dailyTargetCalories: userProfile.dailyTargetCalories,
          maintenanceCalories: userProfile.maintenanceCalories,
        }
      : { dailyTargetCalories: 0, maintenanceCalories: 0 };

    const marks: MarkedDates = {};
    const totals: Record<string, number> = {};

    Object.values(allLogs).forEach(log => {
      const total = getTotalCalories(log);
      totals[log.date] = total;
      const dayTarget = getTargetForDate(
        log.date,
        snapshots,
        fallback,
      ).dailyTargetCalories;
      const tone = getProgressTone(total, dayTarget);
      marks[log.date] = {
        marked: true,
        dotColor: progressColor(tone),
        customStyles: {
          container: {
            backgroundColor: progressMute(tone),
            borderRadius: radii.sm,
          },
          text: {
            color: colors.text,
            fontFamily: fonts.bodySemiBold,
          },
        },
      };
    });

    marks[today] = {
      ...marks[today],
      customStyles: {
        container: {
          ...(marks[today]?.customStyles?.container ?? {}),
          borderWidth: 2,
          borderColor: colors.primary,
          borderRadius: radii.sm,
        },
        text: {
          color: colors.primary,
          fontFamily: fonts.bodyBold,
        },
      },
    };

    setMarkedDates(marks);
    setDayTotals(totals);
  }, [today]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData]),
  );

  const target = profile?.dailyTargetCalories ?? profile?.maintenanceCalories ?? 0;
  const goalType = profile?.goalType ?? 'lose';

  const targetFallback = profile
    ? {
        dailyTargetCalories: profile.dailyTargetCalories,
        maintenanceCalories: profile.maintenanceCalories,
      }
    : { dailyTargetCalories: 0, maintenanceCalories: 0 };

  const getTargetForDay = useCallback(
    (date: string) =>
      getTargetForDate(date, targetSnapshots, targetFallback)
        .dailyTargetCalories,
    [targetFallback, targetSnapshots],
  );

  const periodSummary = useMemo(() => {
    const endDate = today;
    const startDate =
      summaryPeriod === 'week'
        ? getTrailingDates(endDate, 7)[0]!
        : getMonthStart(today);
    return getPeriodSummary(
      logs,
      startDate,
      endDate,
      getTargetForDay,
      goalType,
    );
  }, [
    getTargetForDay,
    goalType,
    logs,
    summaryPeriod,
    today,
  ]);

  const handleDayPress = (day: DateData) => {
    if (isFutureDate(day.dateString)) {
      return;
    }
    setSelectedDate(day.dateString);
    navigation.navigate('DayDetail', { date: day.dateString });
  };

  const handleCopyDayToToday = (dateStr: string) => {
    if (isFutureDate(dateStr) || dateStr === today) {
      return;
    }

    getDailyLog(dateStr).then(log => {
      if (!log.entries.length) {
        return;
      }

      Alert.alert(
        'Copy meals to today?',
        `Copy ${log.entries.length} entr${log.entries.length === 1 ? 'y' : 'ies'} from ${dateStr} to today?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Copy',
            onPress: async () => {
              await copyDayEntries(dateStr, today);
              Alert.alert('Copied', "Today's log has been updated.");
              await loadData();
            },
          },
        ],
      );
    });
  };

  return (
    <Screen edges={[]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.toggleRow}>
          {(['calendar', 'summary'] as HistoryView[]).map(option => (
            <TouchableOpacity
              key={option}
              style={[styles.toggleBtn, view === option && styles.toggleBtnActive]}
              onPress={() => setView(option)}>
              <Text
                style={[
                  styles.toggleText,
                  view === option && styles.toggleTextActive,
                ]}>
                {option === 'calendar' ? 'Calendar' : 'Summary'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {view === 'summary' ? (
          <>
            <View style={styles.periodRow}>
              {(['week', 'month'] as SummaryPeriod[]).map(option => (
                <TouchableOpacity
                  key={option}
                  style={[
                    styles.periodBtn,
                    summaryPeriod === option && styles.periodBtnActive,
                  ]}
                  onPress={() => setSummaryPeriod(option)}>
                  <Text
                    style={[
                      styles.periodText,
                      summaryPeriod === option && styles.periodTextActive,
                    ]}>
                    {option === 'week' ? 'Last 7 days' : 'This month'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <HistorySummaryPanel
              summary={periodSummary}
              goalType={goalType}
              periodLabel={
                summaryPeriod === 'week' ? 'Last 7 days' : 'This month'
              }
            />
          </>
        ) : (
          <>
            <Calendar
              current={selectedDate}
              maxDate={today}
              onDayPress={handleDayPress}
              markedDates={{
                ...markedDates,
                [selectedDate]: {
                  ...markedDates[selectedDate],
                  selected: true,
                  selectedColor: colors.primary,
                },
              }}
              markingType="custom"
              dayComponent={({ date, state, marking, onPress }) => {
                const dateStr = date?.dateString ?? '';
                const total = dayTotals[dateStr];
                const isSelected = state === 'selected';
                const isToday = state === 'today';
                const isFuture = isFutureDate(dateStr);
                const isDisabled = state === 'disabled' || isFuture;
                const customMarking = marking as MarkedDates[string] | undefined;
                const bgColor =
                  (customMarking?.customStyles?.container as {
                    backgroundColor?: string;
                  })?.backgroundColor ?? 'transparent';
                const hasEntries = total !== undefined;

                return (
                  <TouchableOpacity
                    onPress={() => {
                      if (!isDisabled) {
                        onPress?.(date);
                      }
                    }}
                    onLongPress={() => {
                      if (!isDisabled && hasEntries && dateStr !== today) {
                        handleCopyDayToToday(dateStr);
                      }
                    }}
                    delayLongPress={400}
                    disabled={isDisabled}
                    style={[
                      styles.dayCell,
                      { backgroundColor: isSelected ? colors.primary : bgColor },
                      isToday && !isSelected && !isFuture && styles.todayCell,
                    ]}>
                    <Text
                      style={[
                        styles.dayNumber,
                        isDisabled && styles.dayDisabled,
                        isSelected && styles.daySelected,
                        isToday && !isSelected && !isFuture && styles.dayToday,
                      ]}>
                      {date?.day}
                    </Text>
                    {hasEntries && !isFuture && (
                      <Text
                        style={[
                          styles.dayTotal,
                          isSelected && styles.dayTotalSelected,
                          isDisabled && styles.dayTotalDisabled,
                        ]}
                        numberOfLines={1}>
                        {total}
                      </Text>
                    )}
                  </TouchableOpacity>
                );
              }}
              theme={{
                backgroundColor: colors.surface,
                calendarBackground: colors.surface,
                textSectionTitleColor: colors.textSecondary,
                selectedDayBackgroundColor: colors.primary,
                selectedDayTextColor: colors.surface,
                todayTextColor: colors.primary,
                dayTextColor: colors.text,
                textDisabledColor: colors.border,
                dotColor: colors.primary,
                arrowColor: colors.primary,
                monthTextColor: colors.text,
                textDayFontFamily: fonts.bodyMedium,
                textMonthFontFamily: fonts.displayMedium,
                textDayHeaderFontFamily: fonts.bodySemiBold,
                textDayFontWeight: '500',
                textMonthFontWeight: '600',
                textDayHeaderFontWeight: '600',
              }}
              style={styles.calendar}
            />

            <View style={styles.legend}>
              <Text style={styles.legendTitle}>Day colors</Text>
              <View style={styles.legendRow}>
                <View
                  style={[
                    styles.legendSwatch,
                    { backgroundColor: colors.noriMute },
                  ]}>
                  <View
                    style={[
                      styles.legendDot,
                      { backgroundColor: colors.nori },
                    ]}
                  />
                </View>
                <Text style={styles.legendText}>
                  On track ({target || '—'} kcal)
                </Text>
              </View>
              <View style={styles.legendRow}>
                <View
                  style={[
                    styles.legendSwatch,
                    { backgroundColor: colors.saffronMute },
                  ]}>
                  <View
                    style={[
                      styles.legendDot,
                      { backgroundColor: colors.saffron },
                    ]}
                  />
                </View>
                <Text style={styles.legendText}>Near target</Text>
              </View>
              <View style={styles.legendRow}>
                <View
                  style={[
                    styles.legendSwatch,
                    { backgroundColor: colors.chiliMute },
                  ]}>
                  <View
                    style={[
                      styles.legendDot,
                      { backgroundColor: colors.chili },
                    ]}
                  />
                </View>
                <Text style={styles.legendText}>Over daily target</Text>
              </View>
              <Text style={styles.hint}>
                Tap a day for details. Long-press a logged day to copy meals to
                today.
              </Text>
            </View>
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.md,
    paddingBottom: spacing.xl,
  },
  toggleRow: {
    flexDirection: 'row',
    backgroundColor: colors.noriMute,
    borderRadius: radii.md,
    padding: spacing.xs,
    marginBottom: spacing.md,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderRadius: radii.sm,
  },
  toggleBtnActive: {
    backgroundColor: colors.primary,
  },
  toggleText: {
    ...typography.label,
    color: colors.primary,
  },
  toggleTextActive: {
    color: colors.surface,
  },
  periodRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  periodBtn: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    backgroundColor: colors.surface,
  },
  periodBtnActive: {
    borderColor: colors.primary,
    backgroundColor: colors.noriMute,
  },
  periodText: {
    ...typography.label,
    color: colors.textSecondary,
  },
  periodTextActive: {
    color: colors.primary,
  },
  calendar: {
    borderRadius: radii.lg - 2,
    overflow: 'hidden',
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  legend: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg - 2,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  legendTitle: {
    ...typography.overline,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  legendSwatch: {
    width: 28,
    height: 20,
    borderRadius: radii.sm - 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    ...typography.caption,
    color: colors.textSecondary,
    flex: 1,
  },
  hint: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
  dayCell: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 36,
    height: 44,
    borderRadius: radii.sm,
  },
  todayCell: {
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  dayNumber: {
    ...typography.label,
    color: colors.text,
  },
  dayDisabled: {
    color: colors.border,
  },
  daySelected: {
    color: colors.surface,
    fontFamily: fonts.bodyBold,
  },
  dayToday: {
    color: colors.primary,
    fontFamily: fonts.bodyBold,
  },
  dayTotal: {
    fontFamily: fonts.bodyMedium,
    fontSize: 9,
    lineHeight: 12,
    color: colors.textSecondary,
    marginTop: 1,
  },
  dayTotalSelected: {
    color: colors.surface,
  },
  dayTotalDisabled: {
    color: colors.border,
  },
});
