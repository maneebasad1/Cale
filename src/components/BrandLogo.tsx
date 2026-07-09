import React from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';
import { APP_NAME, APP_TAGLINE } from '../constants/branding';
import { colors, fonts, radii, spacing, typography } from '../constants/theme';

interface BrandLogoProps {
  size?: 'sm' | 'lg';
  layout?: 'stacked' | 'row';
  showTagline?: boolean;
  style?: ViewStyle;
}

export function BrandLogo({
  size = 'sm',
  layout = 'stacked',
  showTagline = false,
  style,
}: BrandLogoProps) {
  const isLarge = size === 'lg';
  const isRow = layout === 'row';
  const badgeStyle = isLarge
    ? isRow
      ? styles.badgeRowLg
      : styles.badgeLg
    : isRow
      ? styles.badgeSmRow
      : styles.badgeSm;
  const textStyle = isLarge
    ? isRow
      ? styles.nameRow
      : styles.nameLg
    : isRow
      ? styles.nameSmRow
      : styles.nameSm;

  return (
    <View style={[styles.container, isRow && styles.containerRow, style]}>
      <View style={[styles.badge, badgeStyle]}>
        <Text style={textStyle}>{APP_NAME}</Text>
      </View>
      {showTagline && (
        <Text style={[styles.tagline, isRow && styles.taglineRow]}>
          {APP_TAGLINE}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  containerRow: {
    alignItems: 'flex-start',
    width: '100%',
  },
  badge: {
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeSm: {
    minWidth: 88,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radii.lg,
  },
  badgeLg: {
    minWidth: 140,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    borderRadius: radii.xl,
  },
  badgeSmRow: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
  },
  badgeRowLg: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radii.lg,
  },
  nameSm: {
    fontFamily: fonts.displayBold,
    fontSize: 28,
    color: colors.surface,
    letterSpacing: 2,
  },
  nameSmRow: {
    fontFamily: fonts.displayBold,
    fontSize: 20,
    color: colors.surface,
    letterSpacing: 1.5,
  },
  nameLg: {
    fontFamily: fonts.displayBold,
    fontSize: 40,
    color: colors.surface,
    letterSpacing: 3,
  },
  nameRow: {
    fontFamily: fonts.displayBold,
    fontSize: 30,
    color: colors.surface,
    letterSpacing: 2,
  },
  tagline: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  taglineRow: {
    marginTop: spacing.sm,
    alignSelf: 'center',
    textAlign: 'center',
  },
});
