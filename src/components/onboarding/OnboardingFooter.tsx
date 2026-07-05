import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Button } from '../Button';
import { colors, spacing } from '../../constants/theme';

interface OnboardingFooterProps {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
}

export function OnboardingFooter({
  title,
  onPress,
  disabled,
  loading,
}: OnboardingFooterProps) {
  return (
    <View style={styles.footer}>
      <Button
        title={title}
        onPress={onPress}
        disabled={disabled}
        loading={loading}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    backgroundColor: colors.background,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
});
