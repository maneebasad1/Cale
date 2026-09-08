import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Icon } from './Icon';
import { colors, radii, spacing, typography } from '../constants/theme';

interface SaveProgressBannerProps {
  onPress: () => void;
  onDismiss: () => void;
}

export function SaveProgressBanner({
  onPress,
  onDismiss,
}: SaveProgressBannerProps) {
  return (
    <TouchableOpacity
      style={styles.banner}
      onPress={onPress}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel="Sign in to save your progress">
      <View style={styles.iconWrap}>
        <Icon name="cloud-upload-outline" size={20} color={colors.primary} />
      </View>
      <View style={styles.textWrap}>
        <Text style={styles.title}>Save your progress</Text>
        <Text style={styles.sub}>Sign in to sync. One tap with Google.</Text>
      </View>
      <TouchableOpacity
        onPress={onDismiss}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel="Dismiss">
        <Icon name="close" size={20} color={colors.textSecondary} />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.noriMute,
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: radii.sm,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textWrap: {
    flex: 1,
  },
  title: {
    ...typography.label,
    color: colors.primaryDark,
  },
  sub: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
});
