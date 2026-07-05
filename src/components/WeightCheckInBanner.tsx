import React, { useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Button } from './Button';
import { colors, spacing } from '../constants/theme';
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
        activeOpacity={0.8}>
        <View style={styles.bannerText}>
          <Text style={styles.bannerTitle}>Log this week's weight</Text>
          <Text style={styles.bannerSub}>
            Last recorded: {displayWeight(currentWeightKg, weightUnit)}
          </Text>
        </View>
        <TouchableOpacity onPress={onDismiss} hitSlop={8}>
          <Text style={styles.dismiss}>×</Text>
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
    backgroundColor: colors.chipBg,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  bannerText: {
    flex: 1,
  },
  bannerTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.primaryDark,
  },
  bannerSub: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  dismiss: {
    fontSize: 22,
    color: colors.textSecondary,
    paddingHorizontal: spacing.xs,
  },
  form: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  formTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    paddingVertical: spacing.sm,
  },
  suffix: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  actions: {
    gap: spacing.xs,
  },
  cancel: {
    textAlign: 'center',
    color: colors.textSecondary,
    paddingVertical: spacing.xs,
  },
});
