import React, { useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Button } from './Button';
import { Icon } from './Icon';
import { colors, fonts, radii, spacing, typography } from '../constants/theme';
import type { WeightUnit } from '../types';
import { addWeightEntry } from '../services/weightService';
import { displayWeight, kgToLb, lbToKg } from '../utils/units';

interface WeightCheckInBannerProps {
  weightUnit: WeightUnit;
  currentWeightKg: number;
  onLogged: () => void;
  onDismiss: () => void;
}

export function WeightCheckInBanner({
  weightUnit,
  currentWeightKg,
  onLogged,
  onDismiss,
}: WeightCheckInBannerProps) {
  const [expanded, setExpanded] = useState(false);
  const [weight, setWeight] = useState(
    String(
      Math.round(
        (weightUnit === 'kg' ? currentWeightKg : kgToLb(currentWeightKg)) * 10,
      ) / 10,
    ),
  );
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    const num = parseFloat(weight);
    if (!num || num <= 0) {
      Alert.alert('Invalid weight', 'Enter a valid weight.');
      return;
    }

    setSaving(true);
    try {
      const weightKg = weightUnit === 'kg' ? num : lbToKg(num);
      await addWeightEntry(weightKg);
      onLogged();
      setExpanded(false);
    } finally {
      setSaving(false);
    }
  };

  if (!expanded) {
    return (
      <TouchableOpacity
        style={styles.banner}
        onPress={() => setExpanded(true)}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel="Log this week's weight">
        <View style={styles.iconWrap}>
          <Icon name="scale-outline" size={20} color={colors.primary} />
        </View>
        <View style={styles.bannerText}>
          <Text style={styles.bannerTitle}>Log this week's weight</Text>
          <Text style={styles.bannerSub}>
            Last recorded: {displayWeight(currentWeightKg, weightUnit)}
          </Text>
        </View>
        <TouchableOpacity
          onPress={onDismiss}
          hitSlop={8}
          accessibilityLabel="Dismiss">
          <Icon name="close" size={20} color={colors.textSecondary} />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.form}>
      <Text style={styles.formTitle}>Weekly weight check-in</Text>
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={weight}
          onChangeText={setWeight}
          keyboardType="numeric"
          placeholder="0"
          placeholderTextColor={colors.textSecondary}
        />
        <Text style={styles.suffix}>{weightUnit}</Text>
      </View>
      <View style={styles.actions}>
        <Button title="Save weight" onPress={handleSave} loading={saving} />
        <TouchableOpacity onPress={() => setExpanded(false)}>
          <Text style={styles.cancel}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </View>
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
  bannerText: {
    flex: 1,
  },
  bannerTitle: {
    ...typography.label,
    color: colors.primaryDark,
  },
  bannerSub: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  form: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  formTitle: {
    ...typography.label,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.sm + 2,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  input: {
    flex: 1,
    fontFamily: fonts.displayBold,
    fontSize: 24,
    color: colors.text,
    paddingVertical: spacing.sm,
  },
  suffix: {
    ...typography.body,
    color: colors.textSecondary,
  },
  actions: {
    gap: spacing.xs,
  },
  cancel: {
    ...typography.label,
    textAlign: 'center',
    color: colors.textSecondary,
    paddingVertical: spacing.xs,
  },
});
