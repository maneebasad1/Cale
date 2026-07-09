import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Icon, type IconName } from '../Icon';
import { colors, fonts, radii, spacing, typography } from '../../constants/theme';

interface ProfileMenuRowProps {
  icon: IconName;
  title: string;
  subtitle?: string;
  onPress: () => void;
  destructive?: boolean;
}

export function ProfileMenuRow({
  icon,
  title,
  subtitle,
  onPress,
  destructive,
}: ProfileMenuRowProps) {
  const iconColor = destructive ? colors.chili : colors.nori;

  return (
    <TouchableOpacity
      style={styles.row}
      onPress={onPress}
      activeOpacity={0.7}>
      <View
        style={[
          styles.iconWrap,
          destructive && styles.iconWrapDestructive,
        ]}>
        <Icon name={icon} size={20} color={iconColor} />
      </View>
      <View style={styles.textWrap}>
        <Text style={[styles.title, destructive && styles.destructive]}>
          {title}
        </Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      <Icon
        name="chevron-forward"
        size={18}
        color={destructive ? colors.chili : colors.stone}
      />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: radii.sm + 2,
    backgroundColor: colors.noriMute,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  iconWrapDestructive: {
    backgroundColor: colors.chiliMute,
  },
  textWrap: {
    flex: 1,
    marginRight: spacing.sm,
  },
  title: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 16,
    lineHeight: 22,
    color: colors.ink,
  },
  subtitle: {
    ...typography.caption,
    color: colors.stone,
    marginTop: 2,
  },
  destructive: {
    color: colors.chili,
  },
});
