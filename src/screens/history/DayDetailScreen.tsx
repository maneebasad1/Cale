import React, { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { EntryList } from '../../components/EntryList';
import { FabButton } from '../../components/FabButton';
import { ProgressBar } from '../../components/ProgressBar';
import { Screen } from '../../components/Screen';
import { WorkoutList } from '../../components/WorkoutList';
import {
  colors,
  getProgressTone,
  progressColor,
  progressMute,
  radii,
  spacing,
  typography,
} from '../../constants/theme';
import { useAddEntryNavigation } from '../../hooks/useAddEntryNavigation';
import { useAddWorkoutNavigation } from '../../hooks/useAddWorkoutNavigation';
import type { HistoryStackParamList } from '../../navigation/types';
import { getTargetForDateResolved } from '../../services/targetHistoryService';
import {
  deleteEntry,
  getDailyLog,
  getProfile,
  getTotalCalories,
} from '../../services/storage';
import {
  deleteWorkoutEntry,
  getWorkoutsForDate,
} from '../../services/workoutService';
import type { CalorieEntry, UserProfile } from '../../types';
import type { WorkoutEntry } from '../../types/workout';
import { formatDisplayDate, isFutureDate } from '../../utils/date';
import { getTotalWorkoutCalories } from '../../utils/workoutCalories';

type Props = {
  route: RouteProp<HistoryStackParamList, 'DayDetail'>;
};

export function DayDetailScreen({ route }: Props) {
  const { date } = route.params;
  const { openAddEntry } = useAddEntryNavigation();
  const { openAddWorkout } = useAddWorkoutNavigation();
  const insets = useSafeAreaInsets();
  const [entries, setEntries] = useState<CalorieEntry[]>([]);
  const [workouts, setWorkouts] = useState<WorkoutEntry[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [target, setTarget] = useState(0);

  const canEdit = !isFutureDate(date);

  const loadData = useCallback(async () => {
    const [log, userProfile, dayWorkouts] = await Promise.all([
      getDailyLog(date),
      getProfile(),
      getWorkoutsForDate(date),
    ]);
    setEntries(log.entries);
    setWorkouts(dayWorkouts);
    setProfile(userProfile);
    const resolved = await getTargetForDateResolved(date, userProfile);
    setTarget(resolved.dailyTargetCalories);
  }, [date]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData]),
  );

  const handleEdit = (entry: CalorieEntry) => {
    openAddEntry({ date, entryId: entry.id });
  };

  const handleDelete = async (entryId: string) => {
    await deleteEntry(date, entryId);
    await loadData();
  };

  const handleDeleteWorkout = async (entryId: string) => {
    await deleteWorkoutEntry(date, entryId);
    await loadData();
  };

  const total = getTotalCalories({ date, entries });
  const burned = getTotalWorkoutCalories(workouts);
  const diff = total - target;
  const tone = getProgressTone(total, target);
  const fabOffset = canEdit ? 60 + spacing.lg * 2 + insets.bottom : spacing.xl;

  const badgeLabel =
    total === 0 && burned === 0
      ? 'Nothing logged this day'
      : tone === 'over'
        ? `${diff.toLocaleString()} kcal over target`
        : diff === 0
          ? 'Right on target'
          : tone === 'near'
            ? `${Math.abs(diff).toLocaleString()} kcal left — nearly there`
            : `${Math.abs(diff).toLocaleString()} kcal under target`;

  return (
    <Screen edges={[]}>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: fabOffset }]}>
        <Text style={styles.date}>{formatDisplayDate(date)}</Text>

        <ProgressBar consumed={total} target={target} />

        {burned > 0 ? (
          <Text style={styles.workoutNote}>
            {burned.toLocaleString()} kcal burned from workouts
          </Text>
        ) : null}

        <View
          style={[
            styles.badge,
            { backgroundColor: progressMute(tone) },
          ]}>
          <Text
            style={[
              styles.badgeText,
              { color: progressColor(tone) },
            ]}>
            {badgeLabel}
          </Text>
        </View>

        <Text style={styles.sectionTitle}>Meals</Text>
        <EntryList
          entries={entries}
          onEdit={canEdit ? handleEdit : undefined}
          onDelete={canEdit ? handleDelete : undefined}
        />

        <View style={styles.workoutHeader}>
          <Text style={styles.sectionTitleInline}>Workouts</Text>
          {canEdit ? (
            <TouchableOpacity
              onPress={() => openAddWorkout({ date })}
              style={styles.workoutBtn}
              accessibilityRole="button">
              <Icon name="fitness-outline" size={16} color={colors.primary} />
              <Text style={styles.workoutBtnText}>Log workout</Text>
            </TouchableOpacity>
          ) : null}
        </View>
        {workouts.length > 0 ? (
          <WorkoutList
            entries={workouts}
            onEdit={
              canEdit
                ? entry => openAddWorkout({ date, entryId: entry.id })
                : undefined
            }
            onDelete={canEdit ? handleDeleteWorkout : undefined}
          />
        ) : (
          <Text style={styles.emptyWorkouts}>No workouts logged.</Text>
        )}
      </ScrollView>

      {canEdit && (
        <FabButton onPress={() => openAddEntry({ date })} />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.md,
  },
  date: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  workoutNote: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
  badge: {
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: radii.md,
    alignItems: 'center',
  },
  badgeText: {
    ...typography.label,
  },
  sectionTitle: {
    ...typography.heading,
    color: colors.text,
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  workoutHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  sectionTitleInline: {
    ...typography.heading,
    color: colors.text,
  },
  workoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.noriMute,
    borderRadius: radii.full,
  },
  workoutBtnText: {
    ...typography.label,
    color: colors.primary,
  },
  emptyWorkouts: {
    ...typography.caption,
    color: colors.textSecondary,
  },
});
