import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Icon } from './Icon';
import { useAuth } from '../context/AuthContext';
import { useSync } from '../context/SyncContext';
import { colors, fonts, radii, spacing, typography } from '../constants/theme';

interface SyncStatusIndicatorProps {
  /** Compact icon-only for Home; row with label for Profile. */
  variant?: 'compact' | 'row';
}

export function SyncStatusIndicator({
  variant = 'compact',
}: SyncStatusIndicatorProps) {
  const { isAuthenticated } = useAuth();
  const { snapshot, retrySync } = useSync();
  const [retrying, setRetrying] = useState(false);

  if (!isAuthenticated || snapshot.status === 'synced') {
    return null;
  }

  const handlePress = () => {
    if (snapshot.status === 'pending') {
      Alert.alert(
        'Sync pending',
        `${snapshot.pendingCount} change${
          snapshot.pendingCount === 1 ? '' : 's'
        } waiting to sync when you're online.`,
      );
      return;
    }

    const details = snapshot.attentionItems
      .slice(0, 3)
      .map(item => `• ${item.entity} (${item.operation})`)
      .join('\n');

    Alert.alert(
      'Sync needs attention',
      `Some changes couldn't sync after several tries.\n\n${details}`,
      [
        { text: 'Dismiss', style: 'cancel' },
        {
          text: 'Retry sync',
          onPress: async () => {
            setRetrying(true);
            try {
              await retrySync();
            } finally {
              setRetrying(false);
            }
          },
        },
      ],
    );
  };

  if (variant === 'row') {
    return (
      <TouchableOpacity
        style={styles.row}
        onPress={handlePress}
        accessibilityRole="button"
        accessibilityLabel={
          snapshot.status === 'pending'
            ? `${snapshot.pendingCount} changes pending sync`
            : 'Sync needs attention'
        }>
        <View
          style={[
            styles.iconWell,
            snapshot.status === 'needsAttention'
              ? styles.iconWellWarn
              : styles.iconWellPending,
          ]}>
          {retrying ? (
            <ActivityIndicator size="small" color={colors.saffron} />
          ) : (
            <Icon
              name={
                snapshot.status === 'needsAttention'
                  ? 'alert-circle-outline'
                  : 'cloud-upload-outline'
              }
              size={18}
              color={
                snapshot.status === 'needsAttention'
                  ? colors.chili
                  : colors.saffron
              }
            />
          )}
        </View>
        <View style={styles.rowText}>
          <Text style={styles.rowTitle}>
            {snapshot.status === 'needsAttention'
              ? 'Sync needs attention'
              : 'Waiting to sync'}
          </Text>
          <Text style={styles.rowSub}>
            {snapshot.status === 'needsAttention'
              ? 'Tap to retry failed changes'
              : `${snapshot.pendingCount} change${
                  snapshot.pendingCount === 1 ? '' : 's'
                } queued`}
          </Text>
        </View>
        <Icon name="chevron-forward" size={18} color={colors.stone} />
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      style={[
        styles.compact,
        snapshot.status === 'needsAttention'
          ? styles.compactWarn
          : styles.compactPending,
      ]}
      onPress={handlePress}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={
        snapshot.status === 'pending'
          ? `${snapshot.pendingCount} pending`
          : 'Sync needs attention'
      }>
      {retrying ? (
        <ActivityIndicator size="small" color={colors.saffron} />
      ) : snapshot.status === 'needsAttention' ? (
        <Icon name="alert-circle-outline" size={16} color={colors.chili} />
      ) : (
        <>
          <View style={styles.dot} />
          <Text style={styles.compactCount}>{snapshot.pendingCount}</Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  compact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
  },
  compactPending: {
    backgroundColor: colors.saffronMute,
  },
  compactWarn: {
    backgroundColor: colors.chiliMute,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.saffron,
  },
  compactCount: {
    ...typography.caption,
    color: colors.ink,
    fontFamily: fonts.bodySemiBold,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.porcelain,
    borderRadius: radii.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.line,
    marginBottom: spacing.md,
  },
  iconWell: {
    width: 36,
    height: 36,
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWellPending: {
    backgroundColor: colors.saffronMute,
  },
  iconWellWarn: {
    backgroundColor: colors.chiliMute,
  },
  rowText: {
    flex: 1,
  },
  rowTitle: {
    ...typography.label,
    color: colors.ink,
  },
  rowSub: {
    ...typography.caption,
    color: colors.stone,
    marginTop: 2,
  },
});
