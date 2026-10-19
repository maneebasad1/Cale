import React, { useCallback, useRef, useState } from 'react';
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
import { Icon } from '../../components/Icon';
import { ProgressRing } from '../../components/ProgressRing';
import { Screen } from '../../components/Screen';
import { SaveProgressBanner } from '../../components/SaveProgressBanner';
import { StreakBadge } from '../../components/StreakBadge';
import { SyncStatusIndicator } from '../../components/SyncStatusIndicator';
import { WeightCheckInBanner } from '../../components/WeightCheckInBanner';
import { colors, radii, spacing, typography } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import { drainSyncQueue } from '../../services/sync';
import { useAddEntryNavigation } from '../../hooks/useAddEntryNavigation';
import { useMyFoodsNavigation } from '../../hooks/useMyFoodsNavigation';
import { useToday } from '../../hooks/useToday';
import {
  deleteEntry,
  getAllLogs,
  getDailyLog,
  getProfile,
  getTotalCalories,
  saveProfile,
} from '../../services/storage';
import {
  getLatestWeightEntry,
  shouldPromptWeightCheckIn,
} from '../../services/weightService';
import type { CalorieEntry, UserProfile } from '../../types';
import { getTrailingAverageCalories } from '../../utils/calorieStats';
import { formatDisplayDate } from '../../utils/date';
import { getCurrentStreak } from '../../utils/streak';
import { navigateToAuth } from '../../navigation/navigationRef';
import {
  dismissSaveProgressBanner,
  isSaveProgressBannerDismissed,
} from '../../services/guestMode';
import { maybeRequestInAppReview } from '../../services/reviewPrompt';

export function HomeScreen() {
  const { isGuest } = useAuth();
  const { openAddEntry } = useAddEntryNavigation();
  const { openMyFoods } = useMyFoodsNavigation();
  const insets = useSafeAreaInsets();
  const today = useToday();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [entries, setEntries] = useState<CalorieEntry[]>([]);
  /** Date the entry list was loaded for — used by edit/delete. */
  const [entriesDate, setEntriesDate] = useState(today);
  const loadIdRef = useRef(0);
  const [streak, setStreak] = useState(0);
  const [weeklyAvg, setWeeklyAvg] = useState(0);
  const [showWeightPrompt, setShowWeightPrompt] = useState(false);
  const [showSaveBanner, setShowSaveBanner] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    const loadId = loadIdRef.current + 1;
    loadIdRef.current = loadId;
    const [userProfile, log, logs, latestWeight] = await Promise.all([
      getProfile(),
      getDailyLog(today),
      getAllLogs(),
      getLatestWeightEntry(),
    ]);
    if (loadId !== loadIdRef.current) {
      // A newer load (e.g. after the date rolled over) superseded this one.
      return;
    }
    setProfile(userProfile);
    setEntries(log.entries);
    setEntriesDate(today);
    setStreak(getCurrentStreak(logs, today));
    setWeeklyAvg(getTrailingAverageCalories(logs, today));

    const hasLoggedValue =
      log.entries.length > 0 || getCurrentStreak(logs, today) > 0;
    if (isGuest && hasLoggedValue) {
      const dismissed = await isSaveProgressBannerDismissed();
      setShowSaveBanner(!dismissed);
    } else {
      setShowSaveBanner(false);
    }

    if (!userProfile) {
      setShowWeightPrompt(false);
      return;
    }

    const dismissedToday = userProfile.lastWeightPromptDate === today;
    setShowWeightPrompt(
      !dismissedToday &&
        shouldPromptWeightCheckIn(latestWeight, today),
    );
  }, [isGuest, today]);

  // Re-runs when `today` changes (loadData depends on it), so the screen
  // reloads after midnight / on resume into a new day.
  useFocusEffect(
    useCallback(() => {
      loadData();
      void import('../../services/widgetSnapshot').then(mod =>
        mod.refreshHomeWidget(),
      );
      const timer = setTimeout(() => {
        void maybeRequestInAppReview();
      }, 1200);
      return () => clearTimeout(timer);
    }, [loadData]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    void drainSyncQueue();
    void import('../../services/widgetSnapshot').then(mod =>
      mod.refreshHomeWidget(),
    );
    setRefreshing(false);
  };

  const handleEdit = (entry: CalorieEntry) => {
    openAddEntry({ date: entriesDate, entryId: entry.id });
  };

  const handleDelete = async (entryId: string) => {
    await deleteEntry(entriesDate, entryId);
    await loadData();
  };

  const handleDismissWeightPrompt = async () => {
    if (!profile) {
      return;
    }
    const updated = {
      ...profile,
      lastWeightPromptDate: today,
    };
    await saveProfile(updated);
    setProfile(updated);
    setShowWeightPrompt(false);
  };

  const handleDismissSaveBanner = async () => {
    await dismissSaveProgressBanner();
    setShowSaveBanner(false);
  };

  const total = getTotalCalories({ date: entriesDate, entries });
  const target = profile?.dailyTargetCalories ?? profile?.maintenanceCalories ?? 0;
  const fabOffset = 60 + spacing.lg * 2 + insets.bottom;

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: fabOffset }]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }>
        <View style={styles.headerWrap}>
          <BrandLogo size="sm" layout="row" style={styles.brand} />
          <View style={styles.headerActions}>
            <SyncStatusIndicator variant="compact" />
            <TouchableOpacity
              onPress={openMyFoods}
              style={styles.myFoodsBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityLabel="My Foods"
              accessibilityRole="button">
              <Icon name="nutrition-outline" size={18} color={colors.primary} />
              <Text style={styles.myFoodsBtnText}>My Foods</Text>
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.date}>{formatDisplayDate(today)}</Text>

        <StreakBadge streak={streak} />

        {showSaveBanner ? (
          <SaveProgressBanner
            onPress={() => navigateToAuth('save')}
            onDismiss={handleDismissSaveBanner}
          />
        ) : null}

        {showWeightPrompt && profile && (
          <WeightCheckInBanner
            weightUnit={profile.weightUnit}
            currentWeightKg={profile.weightKg}
            onLogged={loadData}
            onDismiss={handleDismissWeightPrompt}
          />
        )}

        <ProgressRing consumed={total} target={target} />

        <View style={styles.avgRow}>
          <Icon name="time-outline" size={16} color={colors.textSecondary} />
          <Text style={styles.weeklyAvg}>
            7-day avg {weeklyAvg.toLocaleString()} kcal
          </Text>
        </View>

        <Text style={styles.sectionTitle}>Today's log</Text>
        <EntryList
          entries={entries}
          onEdit={handleEdit}
          onDelete={handleDelete}
          iconActions
        />
      </ScrollView>

      <FabButton onPress={() => openAddEntry({ date: today })} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: {
    padding: spacing.lg,
  },
  headerWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  brand: {
    alignSelf: 'flex-start',
    width: undefined,
    flex: 0,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  myFoodsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.sm + 2,
    backgroundColor: colors.noriMute,
    borderRadius: radii.pill,
  },
  myFoodsBtnText: {
    ...typography.label,
    color: colors.primary,
  },
  date: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  avgRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  weeklyAvg: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  sectionTitle: {
    ...typography.heading,
    color: colors.text,
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
});
