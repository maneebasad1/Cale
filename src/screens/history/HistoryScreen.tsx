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
import { colors, spacing } from '../../constants/theme';
import type { HistoryStackParamList } from '../../navigation/types';
import {
  copyDayEntries,
  getAllLogs,
  getDailyLog,
  getProfile,
  getTotalCalories,
} from '../../services/storage';
import type { DailyLog, UserProfile } from '../../types';
import { getPeriodSummary } from '../../utils/calorieStats';
import {
  formatDateKey,
  getMonthStart,
  getWeekStart,
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

  const loadData = useCallback(async () => {
    const [allLogs, userProfile] = await Promise.all([
      getAllLogs(),
      getProfile(),
    ]);
    setProfile(userProfile);
    setLogs(allLogs);

    const target = userProfile?.dailyTargetCalories ?? userProfile?.maintenanceCalories ?? 0;
    const marks: MarkedDates = {};
    const totals: Record<string, number> = {};

    Object.values(allLogs).forEach(log => {
      const total = getTotalCalories(log);
      totals[log.date] = total;
      const isOver = total > target;
      marks[log.date] = {
        marked: true,
        dotColor: isOver ? colors.overMaintenance : colors.underMaintenance,
        customStyles: {
          container: {
            backgroundColor: isOver ? '#FFEBEE' : '#E8F5E9',
            borderRadius: 8,
          },
          text: {
            color: colors.text,
            fontWeight: '600',
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
          borderRadius: 8,
        },
        text: {
          color: colors.primary,
          fontWeight: '700',
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

  const periodSummary = useMemo(() => {
    const endDate = today;
    const startDate =
      summaryPeriod === 'week' ? getWeekStart(today) : getMonthStart(today);
    return getPeriodSummary(logs, startDate, endDate, target, goalType);
  }, [goalType, logs, summaryPeriod, target, today]);

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
                    {option === 'week' ? 'This week' : 'This month'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <HistorySummaryPanel
              summary={periodSummary}
              target={target}
              goalType={goalType}
              periodLabel={
                summaryPeriod === 'week'
                  ? 'Weekly summary'
                  : 'Monthly summary'
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
                textDayFontWeight: '500',
                textMonthFontWeight: '700',
                textDayHeaderFontWeight: '600',
              }}
              style={styles.calendar}
            />

            <View style={styles.legend}>
              <Text style={styles.legendTitle}>Color coding</Text>
              <View style={styles.legendRow}>
                <View
                  style={[
                    styles.legendDot,
                    { backgroundColor: colors.underMaintenance },
                  ]}
                />
                <Text style={styles.legendText}>
                  At or under target ({target || '—'} kcal)
                </Text>
              </View>
              <View style={styles.legendRow}>
                <View
                  style={[
                    styles.legendDot,
                    { backgroundColor: colors.overMaintenance },
                  ]}
                />
                <Text style={styles.legendText}>Over daily target</Text>
              </View>
              <Text style={styles.hint}>
                Tap a day to view entries. Long-press a day with meals to copy
                them to today.
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
    backgroundColor: colors.surface,
    borderRadius: 10,
    padding: spacing.xs,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderRadius: 8,
  },
  toggleBtnActive: {
    backgroundColor: colors.chipBg,
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  toggleTextActive: {
    color: colors.primary,
  },
  periodRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  periodBtn: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    backgroundColor: colors.surface,
  },
  periodBtnActive: {
    borderColor: colors.primary,
    backgroundColor: colors.chipBg,
  },
  periodText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  periodTextActive: {
    color: colors.primary,
  },
  calendar: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: spacing.lg,
  },
  legend: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
  },
  legendTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: spacing.sm,
  },
  legendText: {
    fontSize: 14,
    color: colors.textSecondary,
    flex: 1,
  },
  hint: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    fontStyle: 'italic',
  },
  dayCell: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 36,
    height: 44,
    borderRadius: 8,
  },
  todayCell: {
    borderWidth: 1,
    borderColor: colors.primary,
  },
  dayNumber: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
  },
  dayDisabled: {
    color: colors.border,
  },
  daySelected: {
    color: colors.surface,
    fontWeight: '700',
  },
  dayToday: {
    color: colors.primary,
    fontWeight: '700',
  },
  dayTotal: {
    fontSize: 9,
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
