import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Button } from '../../components/Button';
import { Icon } from '../../components/Icon';
import { UserAvatar } from '../../components/profile/UserAvatar';
import { Screen } from '../../components/Screen';
import { colors, fonts, radii, spacing, typography } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import { deleteAccount } from '../../services/accountService';
import { getUserDisplayName } from '../../utils/authUser';

export function ProfileAccountScreen() {
  const { signOut, user } = useAuth();
  const [deleting, setDeleting] = useState(false);
  const displayName = getUserDisplayName(user);

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
                      Alert.alert(
                        'Could not delete account',
                        error,
                      );
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

  return (
    <Screen edges={[]}>
      <View style={styles.container}>
        <View style={styles.card}>
          <UserAvatar user={user} size={64} style={styles.avatar} />
          <Text style={styles.label}>Signed in as</Text>
          {displayName ? (
            <Text style={styles.displayName}>{displayName}</Text>
          ) : null}
          <Text style={styles.email}>{user?.email ?? 'Unknown account'}</Text>
        </View>

        <Button
          title="Sign out"
          variant="secondary"
          onPress={() =>
            Alert.alert('Sign out', 'Sign out of your CALE account?', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Sign out', style: 'destructive', onPress: signOut },
            ])
          }
          style={styles.signOutBtn}
        />

        <View style={styles.dangerZone}>
          <View style={styles.dangerHeader}>
            <Icon name="alert-circle-outline" size={18} color={colors.chili} />
            <Text style={styles.dangerTitle}>Danger zone</Text>
          </View>
          <Text style={styles.dangerText}>
            Permanently delete your account and all associated data.
          </Text>
          <TouchableOpacity
            style={[styles.deleteBtn, deleting && styles.deleteBtnDisabled]}
            onPress={handleDeleteAccount}
            disabled={deleting}
            activeOpacity={0.8}>
            {deleting ? (
              <ActivityIndicator color={colors.chili} />
            ) : (
              <View style={styles.deleteBtnContent}>
                <Icon name="trash-outline" size={18} color={colors.chili} />
                <Text style={styles.deleteBtnText}>Delete my account</Text>
              </View>
            )}
          </TouchableOpacity>
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
  card: {
    backgroundColor: colors.porcelain,
    borderRadius: radii.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.line,
    marginBottom: spacing.lg,
    alignItems: 'center',
  },
  avatar: {
    marginBottom: spacing.md,
  },
  label: {
    ...typography.caption,
    color: colors.stone,
    marginBottom: spacing.xs,
  },
  displayName: {
    ...typography.heading,
    color: colors.ink,
    marginBottom: spacing.xs,
  },
  email: {
    ...typography.body,
    color: colors.stone,
  },
  signOutBtn: {
    marginBottom: spacing.xl,
  },
  dangerZone: {
    marginTop: spacing.lg,
    paddingTop: spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.line,
  },
  dangerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  dangerTitle: {
    ...typography.label,
    color: colors.chili,
  },
  dangerText: {
    ...typography.caption,
    color: colors.stone,
    marginBottom: spacing.md,
  },
  deleteBtn: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
    backgroundColor: colors.porcelain,
    borderWidth: 1.5,
    borderColor: colors.chili,
  },
  deleteBtnDisabled: {
    opacity: 0.5,
  },
  deleteBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  deleteBtnText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 16,
    lineHeight: 22,
    color: colors.chili,
  },
});
