import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { Button } from './Button';
import { colors, radii, spacing, typography } from '../constants/theme';
import {
  addCustomFood,
  updateCustomFood,
} from '../services/customFoodService';
import type { FoodItem } from '../types/food';
import {
  getCalorieLimitError,
  sanitizeCalorieInput,
} from '../utils/calorieLimits';

interface AddCustomFoodFormProps {
  food?: FoodItem;
  onSaved: (food: FoodItem) => void;
  /** Optional — prefer native back / header dismiss over an in-form Cancel. */
  onCancel?: () => void;
}

export function AddCustomFoodForm({
  food,
  onSaved,
  onCancel,
}: AddCustomFoodFormProps) {
  const isEditing = Boolean(food);
  const [name, setName] = useState(food?.name ?? '');
  const [calories, setCalories] = useState(
    food ? String(food.calories) : '',
  );
  const [serving, setServing] = useState(food?.servingLabel ?? '');
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);

  useEffect(() => {
    setName(food?.name ?? '');
    setCalories(food ? String(food.calories) : '');
    setServing(food?.servingLabel ?? '');
  }, [food]);

  const caloriesNum = parseInt(calories, 10);
  const caloriesError = getCalorieLimitError(caloriesNum);
  const canSave =
    name.trim().length > 0 && caloriesNum > 0 && caloriesError === null;

  const handleSave = async () => {
    if (!canSave || savingRef.current) {
      return;
    }
    savingRef.current = true;
    setSaving(true);

    const payload = {
      name: name.trim(),
      calories: caloriesNum,
      servingLabel: serving.trim() || undefined,
    };

    try {
      const saved = food
        ? await updateCustomFood(food.id, payload)
        : await addCustomFood(payload);

      if (saved) {
        onSaved(saved);
      }
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        {isEditing ? 'Edit food' : 'Add your own food'}
      </Text>
      <Text style={styles.subtitle}>
        {isEditing
          ? 'Update details for this saved food.'
          : 'Saved to your list for quick logging next time.'}
      </Text>

      <Text style={styles.label}>Food name</Text>
      <TextInput
        style={styles.input}
        value={name}
        onChangeText={setName}
        placeholder="e.g. Homemade biryani"
        placeholderTextColor={colors.textSecondary}
        autoCorrect={false}
      />

      <View style={styles.row}>
        <View style={styles.fieldHalf}>
          <Text style={styles.label}>Calories</Text>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.inputCompact}
              value={calories}
              onChangeText={text => setCalories(sanitizeCalorieInput(text))}
              placeholder="0"
              placeholderTextColor={colors.textSecondary}
              keyboardType="number-pad"
            />
            <Text style={styles.suffix}>kcal</Text>
          </View>
          {caloriesError ? (
            <Text style={styles.errorText}>{caloriesError}</Text>
          ) : null}
        </View>
        <View style={styles.fieldHalf}>
          <Text style={styles.label}>Serving (optional)</Text>
          <TextInput
            style={styles.input}
            value={serving}
            onChangeText={setServing}
            placeholder="1 bowl"
            placeholderTextColor={colors.textSecondary}
          />
        </View>
      </View>

      <Button
        title={isEditing ? 'Save changes' : 'Save food'}
        onPress={handleSave}
        disabled={!canSave}
        loading={saving}
        style={styles.saveBtn}
      />
      {onCancel ? (
        <Text style={styles.dismissHint} onPress={onCancel}>
          Close without saving
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  title: {
    ...typography.label,
    color: colors.primaryDark,
  },
  subtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
    marginBottom: spacing.sm,
  },
  label: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  input: {
    backgroundColor: colors.background,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    ...typography.body,
    fontSize: 15,
    lineHeight: 20,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  fieldHalf: {
    flex: 1,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.sm,
    marginBottom: spacing.sm,
  },
  inputCompact: {
    flex: 1,
    ...typography.body,
    fontSize: 15,
    lineHeight: 20,
    color: colors.text,
    paddingVertical: spacing.sm,
  },
  suffix: {
    ...typography.caption,
    color: colors.textSecondary,
    marginLeft: spacing.xs,
  },
  errorText: {
    ...typography.caption,
    color: colors.error,
    marginTop: -spacing.xs,
    marginBottom: spacing.sm,
  },
  saveBtn: {
    minHeight: 48,
    marginTop: spacing.xs,
  },
  dismissHint: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.sm,
    paddingVertical: spacing.xs,
  },
});
