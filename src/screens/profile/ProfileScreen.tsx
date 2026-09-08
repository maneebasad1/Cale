import React, { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { ProfileMenuRow } from '../../components/profile/ProfileMenuRow';
import { UserAvatar } from '../../components/profile/UserAvatar';
import { Screen } from '../../components/Screen';
import { SyncStatusIndicator } from '../../components/SyncStatusIndicator';
import { colors, fonts, radii, spacing, typography } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import { isGoogleSignInConfigured } from '../../config/supabase';
import { navigateToAuth } from '../../navigation/navigationRef';
import type { ProfileStackParamList } from '../../navigation/types';
import { deleteAccount } from '../../services/accountService';
import { getProfile } from '../../services/storage';
import type { UserProfile } from '../../types';
import { getUserDisplayName } from '../../utils/authUser';
import { notificationsSummary } from '../../utils/notificationSummary';

type Nav = NativeStackNavigationProp<ProfileStackParamList, 'ProfileHome'>;

type DialogState =
  | { type: 'none' }
  | { type: 'signOut' }
  | { type: 'delete' }
  | { type: 'deleteConfirm' }
  | { type: 'error'; message: string };

export function ProfileScreen() {
  const navigation = useNavigation<Nav>();
  const { user, isGuest, signOut, signInWithGoogle } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [dialog, setDialog] = useState<DialogState>({ type: 'none' });

  const loadProfile = useCallback(async () => {
    const p = await getProfile();
    setProfile(p);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, [loadProfile]),
  );

  const closeDialog = () => setDialog({ type: 'none' });

  const runDelete = async () => {
    setDeleting(true);
    const { error } = await deleteAccount();
    setDeleting(false);
    if (error) {
      setDialog({ type: 'error', message: error });
      return;
    }
    closeDialog();
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

  const displayName = isGuest
    ? 'On this device'
    : getUserDisplayName(user);

  const handleGoogleSave = async () => {
    setGoogleLoading(true);
    const result = await signInWithGoogle();
    setGoogleLoading(false);
    if (result.error) {
      setDialog({ type: 'error', message: result.error });
    }
  };

  return (
    <Screen edges={[]}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}>
        <View style={styles.headerCard}>
          <UserAvatar user={user} size={60} style={styles.avatar} />
          {displayName ? (
            <Text style={styles.displayName}>{displayName}</Text>
          ) : null}
          {isGuest ? (
            <Text style={styles.email}>Not signed in · data stays on this phone</Text>
          ) : user?.email ? (
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
            subtitle={notificationsSummary(profile)}
            onPress={() => navigation.navigate('ProfileNotifications')}
            last
          />
        </View>

        {isGuest ? (
          <View style={styles.menuGroup}>
            {isGoogleSignInConfigured() ? (
              <ProfileMenuRow
                icon="logo-google"
                title="Continue with Google"
                subtitle="One tap to save and sync"
                onPress={handleGoogleSave}
                showChevron={false}
                loading={googleLoading}
                last={false}
              />
            ) : null}
            <ProfileMenuRow
              icon="mail-outline"
              title="Sign in with email"
              subtitle="Keep your log if you switch phones"
              onPress={() => navigateToAuth('save')}
              last
            />
          </View>
        ) : (
          <View style={styles.menuGroup}>
            <ProfileMenuRow
              icon="trash-outline"
              title="Delete account"
              subtitle="Permanently remove your account and data"
              onPress={() => setDialog({ type: 'delete' })}
              destructive
              showChevron={false}
              loading={deleting}
            />
            <ProfileMenuRow
              icon="log-out-outline"
              title="Sign out"
              subtitle="Sign out of your account"
              onPress={() => setDialog({ type: 'signOut' })}
              showChevron={false}
              last
            />
          </View>
        )}
      </ScrollView>

      <ConfirmDialog
        visible={dialog.type === 'signOut'}
        title="Sign out"
        message="Sign out of your CALE account?"
        confirmLabel="Sign out"
        tone="destructive"
        onCancel={closeDialog}
        onConfirm={() => {
          closeDialog();
          void signOut();
        }}
      />

      <ConfirmDialog
        visible={dialog.type === 'delete'}
        title="Delete account"
        message="This permanently deletes your account and all your data. This cannot be undone."
        confirmLabel="Continue"
        tone="destructive"
        onCancel={closeDialog}
        onConfirm={() => setDialog({ type: 'deleteConfirm' })}
      />

      <ConfirmDialog
        visible={dialog.type === 'deleteConfirm'}
        title="Are you sure?"
        message="Your calorie logs, custom foods, and weight history will be permanently removed."
        confirmLabel="Yes, delete"
        tone="destructive"
        loading={deleting}
        onCancel={closeDialog}
        onConfirm={() => {
          void runDelete();
        }}
      />

      <ConfirmDialog
        visible={dialog.type === 'error'}
        title="Something went wrong"
        message={dialog.type === 'error' ? dialog.message : ''}
        confirmLabel="OK"
        showCancel={false}
        onCancel={closeDialog}
        onConfirm={closeDialog}
      />
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
    padding: spacing.md,
    marginBottom: spacing.md,
    alignItems: 'center',
  },
  avatar: {
    marginBottom: spacing.sm,
  },
  displayName: {
    ...typography.heading,
    color: colors.ink,
    // marginBottom: spacing.xs,
  },
  email: {
    ...typography.caption,
    color: colors.stone,
    marginBottom: spacing.md,
  },
  targetValue: {
    fontFamily: fonts.displayBold,
    fontSize: 24,
    lineHeight: 34,
    color: colors.nori,
  },
  targetSub: {
    ...typography.caption,
    color: colors.stone,
  },
  menuGroup: {
    backgroundColor: colors.porcelain,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.line,
    overflow: 'hidden',
    marginBottom: spacing.md,
  },
});
