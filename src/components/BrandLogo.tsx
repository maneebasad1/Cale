import React from 'react';
import { Image, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { APP_ICON, APP_TAGLINE } from '../constants/branding';
import { colors, spacing, typography } from '../constants/theme';

interface BrandLogoProps {
  size?: 'sm' | 'lg';
  layout?: 'stacked' | 'row';
  showTagline?: boolean;
  style?: ViewStyle;
}

const ICON_SIZE = {
  sm: { stacked: 72, row: 44 },
  lg: { stacked: 120, row: 72 },
} as const;

export function BrandLogo({
  size = 'sm',
  layout = 'stacked',
  showTagline = false,
  style,
}: BrandLogoProps) {
  const isRow = layout === 'row';
  const iconSize = ICON_SIZE[size][isRow ? 'row' : 'stacked'];

  return (
    <View style={[styles.container, isRow && styles.containerRow, style]}>
      <Image
        source={APP_ICON}
        style={[
          styles.icon,
          {
            width: iconSize,
            height: iconSize,
            borderRadius: iconSize * 0.22,
          },
        ]}
        accessibilityLabel="CALE"
      />
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
  icon: {
    overflow: 'hidden',
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
