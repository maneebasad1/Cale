import React from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  ViewStyle,
} from 'react-native';
import { colors, radii, spacing, typography } from '../constants/theme';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost';
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  style,
}: ButtonProps) {
  const isPrimary = variant === 'primary';
  const isGhost = variant === 'ghost';

  return (
    <TouchableOpacity
      style={[
        styles.button,
        isPrimary && styles.primary,
        variant === 'secondary' && styles.secondary,
        isGhost && styles.ghost,
        (disabled || loading) && styles.disabled,
        style,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || loading }}>
      {loading ? (
        <ActivityIndicator color={isPrimary ? colors.surface : colors.primary} />
      ) : (
        <Text
          style={[
            styles.text,
            isPrimary && styles.primaryText,
            variant === 'secondary' && styles.secondaryText,
            isGhost && styles.ghostText,
          ]}>
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  primary: {
    backgroundColor: colors.primary,
  },
  secondary: {
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  disabled: {
    opacity: 0.5,
  },
  text: {
    ...typography.label,
    fontSize: 16,
  },
  primaryText: {
    color: colors.surface,
  },
  secondaryText: {
    color: colors.primary,
  },
  ghost: {
    backgroundColor: 'transparent',
    minHeight: 44,
    paddingVertical: spacing.sm,
  },
  ghostText: {
    color: colors.nori,
  },
});
