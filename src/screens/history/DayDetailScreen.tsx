import React, { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { EntryList } from '../../components/EntryList';
import { FabButton } from '../../components/FabButton';
import { ProgressBar } from '../../components/ProgressBar';
import { Screen } from '../../components/Screen';
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
import type { HistoryStackParamList } from '../../navigation/types';
import {
  deleteEntry,
  getDailyLog,
  getProfile,
  getTotalCalories,
} from '../../services/storage';
import type { CalorieEntry, UserProfile } from '../../types';
import { formatDisplayDate, isFutureDate } from '../../utils/date';

type Props = {
  route: RouteProp<HistoryStackParamList, 'DayDetail'>;
};

export function DayDetailScreen({ route }: Props) {
  const { date } = route.params;
  const { openAddEntry } = useAddEntryNavigation();
  const insets = useSafeAreaInsets();
  const [entries, setEntries] = useState<CalorieEntry[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);

  const canEdit = !isFutureDate(date);

  const loadData = useCallback(async () => {
    const [log, userProfile] = await Promise.all([
      getDailyLog(date),
      getProfile(),
    ]);
    setEntries(log.entries);
    setProfile(userProfile);
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

  const total = getTotalCalories({ date, entries });
  const target = profile?.dailyTargetCalories ?? profile?.maintenanceCalories ?? 0;
  const diff = total - target;
  const tone = getProgressTone(total, target);
  const fabOffset = canEdit ? 60 + spacing.lg * 2 + insets.bottom : spacing.xl;

  const badgeLabel =
    total === 0
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

        <Text style={styles.sectionTitle}>Entries</Text>
        <EntryList
          entries={entries}
          onEdit={canEdit ? handleEdit : undefined}
          onDelete={canEdit ? handleDelete : undefined}
        />
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
});
