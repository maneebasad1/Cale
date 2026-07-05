import React from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';
import { Icon } from './Icon';
import { APP_NAME, APP_TAGLINE } from '../constants/branding';
import { colors, spacing } from '../constants/theme';

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
  const iconSize = isLarge
    ? isRow
      ? 28
      : 48
    : isRow
      ? 20
      : 32;
  const nameStyle = isLarge
    ? isRow
      ? styles.nameRow
      : styles.nameLg
    : isRow
      ? styles.nameSmRow
      : styles.nameSm;
  const iconWrapStyle = isLarge
    ? isRow
      ? styles.iconWrapRow
      : styles.iconWrapLg
    : isRow
      ? styles.iconWrapSmRow
      : styles.iconWrapSm;

  return (
    <View style={[styles.container, isRow && styles.containerRow, style]}>
      <View
        style={[
          isRow && styles.row,
          isRow && !isLarge && styles.rowCompact,
          isRow && showTagline && styles.rowWithTagline,
        ]}>
        <View style={[styles.iconWrap, iconWrapStyle, isRow && styles.iconWrapInline]}>
          <Icon name="flame" size={iconSize} color={colors.surface} />
        </View>
        <Text style={nameStyle}>{APP_NAME}</Text>
      </View>
      {showTagline && (
        <Text style={[styles.tagline, isRow && styles.taglineRow]}>{APP_TAGLINE}</Text>
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  rowCompact: {
    gap: spacing.sm,
  },
  rowWithTagline: {
    alignSelf: 'center',
  },
  iconWrap: {
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  iconWrapInline: {
    marginBottom: 0,
  },
  iconWrapSm: {
    width: 56,
    height: 56,
    borderRadius: 16,
  },
  iconWrapSmRow: {
    width: 36,
    height: 36,
    borderRadius: 10,
  },
  iconWrapLg: {
    width: 88,
    height: 88,
    borderRadius: 24,
  },
  iconWrapRow: {
    width: 48,
    height: 48,
    borderRadius: 14,
  },
  nameSm: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: -0.5,
  },
  nameSmRow: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: -0.5,
  },
  nameLg: {
    fontSize: 42,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: -1,
  },
  nameRow: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: 15,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  taglineRow: {
    marginTop: spacing.sm,
    alignSelf: 'center',
    textAlign: 'center',
  },
});
