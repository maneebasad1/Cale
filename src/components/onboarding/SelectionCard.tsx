import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Icon, IconName } from '../Icon';
import { colors, fonts, radii, spacing, typography } from '../../constants/theme';

interface SelectionCardProps {
  label: string;
  description?: string;
  selected: boolean;
  onPress: () => void;
  icon?: IconName;
}

export function SelectionCard({
  label,
  description,
  selected,
  onPress,
  icon,
}: SelectionCardProps) {
  return (
    <TouchableOpacity
      style={[styles.card, selected && styles.cardSelected]}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityState={{ selected }}>
      {icon && (
        <View style={[styles.iconWrap, selected && styles.iconWrapSelected]}>
          <Icon
            name={icon}
            size={22}
            color={selected ? colors.surface : colors.primary}
          />
        </View>
      )}
      <View style={styles.textWrap}>
        <Text style={[styles.label, selected && styles.labelSelected]}>
          {label}
        </Text>
        {description && (
          <Text
            style={[styles.description, selected && styles.descriptionSelected]}>
            {description}
          </Text>
        )}
      </View>
      <View style={[styles.radio, selected && styles.radioSelected]}>
        {selected && <View style={styles.radioInner} />}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: radii.lg - 2,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
    gap: spacing.md,
  },
  cardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.noriMute,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.noriMute,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapSelected: {
    backgroundColor: colors.primary,
  },
  textWrap: {
    flex: 1,
  },
  label: {
    ...typography.bodyMedium,
    fontFamily: fonts.bodySemiBold,
    color: colors.text,
    marginBottom: 2,
  },
  labelSelected: {
    color: colors.primaryDark,
  },
  description: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  descriptionSelected: {
    color: colors.primary,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: {
    borderColor: colors.primary,
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.primary,
  },
});
