import React, { useCallback, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ProfileMenuRow } from '../../components/profile/ProfileMenuRow';
import { UserAvatar } from '../../components/profile/UserAvatar';
import { Screen } from '../../components/Screen';
import { SyncStatusIndicator } from '../../components/SyncStatusIndicator';
import { colors, fonts, radii, spacing, typography } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import type { ProfileStackParamList } from '../../navigation/types';
import { deleteAccount } from '../../services/accountService';
import { getProfile } from '../../services/storage';
import type { UserProfile } from '../../types';
import { getUserDisplayName } from '../../utils/authUser';
import { enabledMealReminderSummary } from '../../utils/mealReminders';

type Nav = NativeStackNavigationProp<ProfileStackParamList, 'ProfileHome'>;

export function ProfileScreen() {
  const navigation = useNavigation<Nav>();
  const { user, signOut } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadProfile = useCallback(async () => {
    const p = await getProfile();
    setProfile(p);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, [loadProfile]),
  );

  const handleSignOut = () => {
    Alert.alert('Sign out', 'Sign out of your CALE account?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: signOut },
    ]);
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete account',
      'This permanently deletes your account and all your data. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete my account',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Are you sure?',
              'Your calorie logs, custom foods, and weight history will be permanently removed.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Yes, delete',
                  style: 'destructive',
                  onPress: async () => {
                    setDeleting(true);
                    const { error } = await deleteAccount();
                    setDeleting(false);
                    if (error) {
                      Alert.alert('Could not delete account', error);
                    }
                  },
                },
              ],
            );
          },
        },
      ],
    );
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

  const goalLabel =
    profile.goalType === 'maintain'
      ? 'Maintain weight'
      : profile.goalType === 'lose'
        ? 'Lose weight'
        : 'Gain weight';

  const displayName = getUserDisplayName(user);

  return (
    <Screen edges={[]}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}>
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

        <SyncStatusIndicator variant="row" />

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
            last
          />
        </View>

        <View style={styles.menuGroup}>
          <ProfileMenuRow
            icon="trash-outline"
            title="Delete account"
            subtitle="Permanently remove your account and data"
            onPress={handleDeleteAccount}
            destructive
            showChevron={false}
            loading={deleting}
          />
          <ProfileMenuRow
            icon="log-out-outline"
            title="Sign out"
            subtitle="Sign out of your account"
            onPress={handleSignOut}
            showChevron={false}
            last
          />
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
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
  headerCard: {
    backgroundColor: colors.noriMute,
    borderRadius: radii.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    alignItems: 'center',
  },
  avatar: {
    marginBottom: spacing.sm,
  },
  displayName: {
    ...typography.heading,
    color: colors.ink,
    marginBottom: spacing.xs,
  },
  email: {
    ...typography.caption,
    color: colors.stone,
    marginBottom: spacing.md,
  },
  targetValue: {
    fontFamily: fonts.displayBold,
    fontSize: 28,
    lineHeight: 34,
    color: colors.nori,
  },
  targetSub: {
    ...typography.caption,
    color: colors.stone,
    marginTop: spacing.xs,
  },
  menuGroup: {
    backgroundColor: colors.porcelain,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.line,
    overflow: 'hidden',
    marginBottom: spacing.lg,
  },
});
