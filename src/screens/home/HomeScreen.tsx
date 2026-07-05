import React, { useCallback, useState } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BrandLogo } from '../../components/BrandLogo';
import { EntryList } from '../../components/EntryList';
import { FabButton } from '../../components/FabButton';
import { ProgressBar } from '../../components/ProgressBar';
import { Screen } from '../../components/Screen';
import { StreakBadge } from '../../components/StreakBadge';
import { WeightCheckInBanner } from '../../components/WeightCheckInBanner';
import { colors, spacing } from '../../constants/theme';
import { useAddEntryNavigation } from '../../hooks/useAddEntryNavigation';
import { useMyFoodsNavigation } from '../../hooks/useMyFoodsNavigation';
import {
  deleteEntry,
  getAllLogs,
  getProfile,
  getTodayLog,
  getTotalCalories,
  saveProfile,
} from '../../services/storage';
import {
  getLatestWeightEntry,
  shouldPromptWeightCheckIn,
} from '../../services/weightService';
import type { CalorieEntry, UserProfile } from '../../types';
import { getTrailingAverageCalories } from '../../utils/calorieStats';
import { formatDateKey, formatDisplayDate } from '../../utils/date';
import { getCurrentStreak } from '../../utils/streak';

export function HomeScreen() {
  const { openAddEntry } = useAddEntryNavigation();
  const { openMyFoods } = useMyFoodsNavigation();
  const insets = useSafeAreaInsets();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [entries, setEntries] = useState<CalorieEntry[]>([]);
  const [streak, setStreak] = useState(0);
  const [weeklyAvg, setWeeklyAvg] = useState(0);
  const [showWeightPrompt, setShowWeightPrompt] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    const today = formatDateKey();
    const [userProfile, log, logs, latestWeight] = await Promise.all([
      getProfile(),
      getTodayLog(),
      getAllLogs(),
      getLatestWeightEntry(),
    ]);
    setProfile(userProfile);
    setEntries(log.entries);
    setStreak(getCurrentStreak(logs, today));
    setWeeklyAvg(getTrailingAverageCalories(logs, today));

    if (!userProfile) {
      setShowWeightPrompt(false);
      return;
    }

    const dismissedToday = userProfile.lastWeightPromptDate === today;
    setShowWeightPrompt(
      !dismissedToday &&
        shouldPromptWeightCheckIn(latestWeight, today),
    );
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleEdit = (entry: CalorieEntry) => {
    openAddEntry({ date: formatDateKey(), entryId: entry.id });
  };

  const handleDelete = async (entryId: string) => {
    await deleteEntry(formatDateKey(), entryId);
    await loadData();
  };

  const handleDismissWeightPrompt = async () => {
    if (!profile) {
      return;
    }
    const updated = {
      ...profile,
      lastWeightPromptDate: formatDateKey(),
    };
    await saveProfile(updated);
    setProfile(updated);
    setShowWeightPrompt(false);
  };

  const total = getTotalCalories({ date: formatDateKey(), entries });
  const target = profile?.dailyTargetCalories ?? profile?.maintenanceCalories ?? 0;
  const fabOffset = 60 + spacing.lg * 2 + insets.bottom;

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: fabOffset }]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }>
        <View style={styles.headerWrap}>
          <BrandLogo size="sm" layout="row" style={styles.brand} />
          <TouchableOpacity
            onPress={openMyFoods}
            style={styles.myFoodsBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={styles.myFoodsBtnText}>My Foods</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.date}>{formatDisplayDate(formatDateKey())}</Text>

        <StreakBadge streak={streak} />

        {showWeightPrompt && profile && (
          <WeightCheckInBanner
            weightUnit={profile.weightUnit}
            currentWeightKg={profile.weightKg}
            onLogged={loadData}
            onDismiss={handleDismissWeightPrompt}
          />
        )}

        <ProgressBar consumed={total} target={target} />

        <Text style={styles.weeklyAvg}>
          7-day avg: {weeklyAvg.toLocaleString()} kcal
        </Text>

        <Text style={styles.sectionTitle}>Today's Log</Text>
        <EntryList
          entries={entries}
          onEdit={handleEdit}
          onDelete={handleDelete}
          iconActions
        />
      </ScrollView>

      <FabButton
        onPress={() => openAddEntry({ date: formatDateKey() })}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: {
    padding: spacing.lg,
  },
  headerWrap: {
    position: 'relative',
    marginBottom: spacing.md,
  },
  brand: {
    alignSelf: 'flex-start',
    marginBottom: spacing.sm,
  },
  myFoodsBtn: {
    position: 'absolute',
    top: 0,
    right: 0,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.chipBg,
    borderRadius: 8,
  },
  myFoodsBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  date: {
    fontSize: 15,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  weeklyAvg: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
});
