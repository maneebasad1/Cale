import React, { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ProfileMenuRow } from '../../components/profile/ProfileMenuRow';
import { UserAvatar } from '../../components/profile/UserAvatar';
import { Screen } from '../../components/Screen';
import { colors, spacing } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import type { ProfileStackParamList } from '../../navigation/types';
import { getProfile } from '../../services/storage';
import type { UserProfile } from '../../types';
import { getUserDisplayName } from '../../utils/authUser';
import { enabledMealReminderSummary } from '../../utils/mealReminders';

type Nav = NativeStackNavigationProp<ProfileStackParamList, 'ProfileHome'>;

export function ProfileScreen() {
  const navigation = useNavigation<Nav>();
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);

  const loadProfile = useCallback(async () => {
    const p = await getProfile();
    setProfile(p);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, [loadProfile]),
  );

  if (!profile) {
    return (
      <Screen edges={[]}>
        <View style={styles.loading}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </Screen>
    );
  }

  const goalLabel =
    profile.goalType === 'maintain'
      ? 'Maintain weight'
      : profile.goalType === 'lose'
        ? 'Lose weight'
        : 'Gain weight';

  const displayName = getUserDisplayName(user);

  return (
    <Screen edges={[]}>
      <View style={styles.container}>
        <View style={styles.headerCard}>
          <UserAvatar user={user} size={80} style={styles.avatar} />
          {displayName ? (
            <Text style={styles.displayName}>{displayName}</Text>
          ) : null}
          {user?.email ? (
            <Text style={styles.email}>{user.email}</Text>
          ) : null}
          <Text style={styles.targetValue}>
            {profile.dailyTargetCalories.toLocaleString()} kcal/day
          </Text>
          <Text style={styles.targetSub}>{goalLabel}</Text>
        </View>

        <View style={styles.menuGroup}>
          <ProfileMenuRow
            icon="settings-outline"
            title="Settings"
            subtitle="Weight, height, age, gender, activity"
            onPress={() => navigation.navigate('ProfileBody')}
          />
          <ProfileMenuRow
            icon="flag-outline"
            title="Goals"
            subtitle={goalLabel}
            onPress={() => navigation.navigate('ProfileGoals')}
          />
          <ProfileMenuRow
            icon="fitness-outline"
            title="Weight"
            subtitle="Log and view weight history"
            onPress={() => navigation.navigate('ProfileWeight')}
          />
          <ProfileMenuRow
            icon="notifications-outline"
            title="Notifications"
            subtitle={enabledMealReminderSummary(profile)}
            onPress={() => navigation.navigate('ProfileNotifications')}
          />
          <ProfileMenuRow
            icon="person-circle-outline"
            title="Account"
            subtitle="Sign out and account options"
            onPress={() => navigation.navigate('ProfileAccount')}
          />
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: spacing.lg,
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: colors.textSecondary,
  },
  headerCard: {
    backgroundColor: colors.chipBg,
    borderRadius: 12,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    alignItems: 'center',
  },
  avatar: {
    marginBottom: spacing.sm,
  },
  displayName: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  email: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  targetValue: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.primary,
  },
  targetSub: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  menuGroup: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
});
