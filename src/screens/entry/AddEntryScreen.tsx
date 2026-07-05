import React, { useCallback, useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { FormSection } from '../../components/onboarding/FormSection';
import { OnboardingFooter } from '../../components/onboarding/OnboardingFooter';
import { Button } from '../../components/Button';
import { FoodSearchList } from '../../components/FoodSearchList';
import { KeyboardAwareScreen } from '../../components/KeyboardAwareScreen';
import { MealChipSelector } from '../../components/MealChipSelector';
import { QuickCalorieChips } from '../../components/QuickCalorieChips';
import { Screen } from '../../components/Screen';
import { UnitToggle } from '../../components/UnitToggle';
import { colors, spacing } from '../../constants/theme';
import type { MainStackParamList } from '../../navigation/types';
import { resolveFoodById } from '../../services/foodService';
import { onMealsLogged } from '../../services/notificationService';
import {
  addEntry,
  getDailyLog,
  getLastEntryForMeal,
  getProfile,
  updateEntry,
} from '../../services/storage';
import type { MealType } from '../../types';
import { MEAL_LABELS } from '../../types';
import type { EntryMode, FoodItem } from '../../types/food';
import { formatDisplayDate, isToday } from '../../utils/date';

type Nav = NativeStackNavigationProp<MainStackParamList, 'AddEntry'>;
type Route = RouteProp<MainStackParamList, 'AddEntry'>;

export function AddEntryScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { date, entryId } = route.params;
  const isEditing = Boolean(entryId);

  const [mealType, setMealType] = useState<MealType>('breakfast');
  const [entryMode, setEntryMode] = useState<EntryMode>('food');
  const [calories, setCalories] = useState('');
  const [selectedFood, setSelectedFood] = useState<FoodItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(!entryId);
  const [repeatLabel, setRepeatLabel] = useState<string | null>(null);

  useEffect(() => {
    navigation.setOptions({
      title: isEditing ? 'Edit Entry' : 'Add Entry',
    });
  }, [navigation, isEditing]);

  useEffect(() => {
    if (!entryId) {
      return;
    }

    getDailyLog(date).then(async log => {
      const entry = log.entries.find(e => e.id === entryId);
      if (!entry) {
        setLoaded(true);
        return;
      }

      setMealType(entry.mealType);
      setCalories(String(entry.calories));
      setEntryMode(entry.entryMode ?? (entry.foodName ? 'food' : 'custom'));

      if (entry.foodId) {
        const resolved = await resolveFoodById(entry.foodId);
        setSelectedFood(
          resolved ?? {
            id: entry.foodId,
            name: entry.foodName ?? 'Food',
            calories: entry.calories,
            servingLabel: entry.servingLabel ?? '',
            region: 'general',
            source: entry.foodId.startsWith('user-') ? 'user' : 'local',
          },
        );
      } else if (entry.foodName) {
        setSelectedFood({
          id: 'custom-food',
          name: entry.foodName,
          calories: entry.calories,
          servingLabel: entry.servingLabel ?? '',
          region: 'general',
          source: 'local',
        });
      }

      setLoaded(true);
    });
  }, [date, entryId]);

  const handleSelectFood = (food: FoodItem) => {
    setSelectedFood(food);
    setCalories(String(food.calories));
  };

  const handleModeChange = (mode: EntryMode) => {
    setEntryMode(mode);
    if (mode === 'custom') {
      setSelectedFood(null);
      if (!isEditing) {
        setCalories('');
      }
    } else if (!selectedFood) {
      setCalories('');
    }
  };

  useEffect(() => {
    if (isEditing) {
      return;
    }

    getLastEntryForMeal(mealType, date).then(result => {
      if (!result) {
        setRepeatLabel(null);
        return;
      }

      const label = result.entry.foodName
        ? result.entry.foodName
        : `${result.entry.calories} kcal`;
      setRepeatLabel(`${MEAL_LABELS[mealType]} · ${label}`);
    });
  }, [date, isEditing, mealType]);

  const applyRepeatEntry = async () => {
    const result = await getLastEntryForMeal(mealType, date);
    if (!result) {
      return;
    }

    const { entry } = result;
    setEntryMode(entry.entryMode ?? (entry.foodName ? 'food' : 'custom'));
    setCalories(String(entry.calories));

    if (entry.foodId) {
      const resolved = await resolveFoodById(entry.foodId);
      setSelectedFood(
        resolved ?? {
          id: entry.foodId,
          name: entry.foodName ?? 'Food',
          calories: entry.calories,
          servingLabel: entry.servingLabel ?? '',
          region: 'general',
          source: entry.foodId.startsWith('user-') ? 'user' : 'local',
        },
      );
    } else if (entry.foodName) {
      setSelectedFood({
        id: 'custom-food',
        name: entry.foodName,
        calories: entry.calories,
        servingLabel: entry.servingLabel ?? '',
        region: 'general',
        source: 'local',
      });
    } else {
      setSelectedFood(null);
    }
  };

  const handlePrefillRepeat = () => {
    applyRepeatEntry();
  };

  const handleQuickRepeatSave = () => {
    Alert.alert(
      'Repeat last entry?',
      `Save the same ${MEAL_LABELS[mealType].toLowerCase()} as your last logged one?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Save',
          onPress: async () => {
            const result = await getLastEntryForMeal(mealType, date);
            if (!result) {
              return;
            }

            const { entry } = result;
            setSaving(true);
            try {
              await addEntry(date, {
                mealType,
                calories: entry.calories,
                entryMode: entry.entryMode ?? (entry.foodName ? 'food' : 'custom'),
                foodName: entry.foodName,
                foodId: entry.foodId,
                servingLabel: entry.servingLabel,
              });
              const profile = await getProfile();
              if (profile) {
                await onMealsLogged(profile);
              }
              navigation.goBack();
            } finally {
              setSaving(false);
            }
          },
        },
      ],
    );
  };

  const handleQuickAddCalories = (amount: number) => {
    const current = parseInt(calories, 10) || 0;
    setCalories(String(current + amount));
  };

  const isValid =
    parseInt(calories, 10) > 0 &&
    (entryMode === 'custom' || selectedFood !== null);

  const handleSave = useCallback(async () => {
    const num = parseInt(calories, 10);
    if (!num || num <= 0) {
      return;
    }
    if (entryMode === 'food' && !selectedFood) {
      return;
    }

    setSaving(true);
    try {
      const payload = {
        mealType,
        calories: num,
        entryMode,
        foodName: entryMode === 'food' ? selectedFood?.name : undefined,
        foodId: entryMode === 'food' ? selectedFood?.id : undefined,
        servingLabel:
          entryMode === 'food' ? selectedFood?.servingLabel : undefined,
      };

      if (entryId) {
        await updateEntry(date, entryId, payload);
      } else {
        await addEntry(date, payload);
        const profile = await getProfile();
        if (profile) {
          await onMealsLogged(profile);
        }
      }
      navigation.goBack();
    } finally {
      setSaving(false);
    }
  }, [
    calories,
    date,
    entryId,
    entryMode,
    mealType,
    navigation,
    selectedFood,
  ]);

  if (!loaded) {
    return (
      <Screen edges={['bottom']}>
        <View style={styles.loading}>
          <Text style={styles.loadingText}>Loading…</Text>
        </View>
      </Screen>
    );
  }

  const dateLabel = isToday(date)
    ? `Today · ${formatDisplayDate(date)}`
    : formatDisplayDate(date);

  return (
    <Screen edges={['bottom']}>
      <KeyboardAwareScreen
        contentContainerStyle={styles.content}
        footer={
          <OnboardingFooter
            title={isEditing ? 'Update Entry' : 'Save Entry'}
            onPress={handleSave}
            disabled={!isValid}
            loading={saving}
          />
        }>
        <Text style={styles.dateLabel}>{dateLabel}</Text>

        <FormSection title="Meal">
          <MealChipSelector value={mealType} onChange={setMealType} />
          {!isEditing && repeatLabel && (
            <View style={styles.repeatRow}>
              <TouchableOpacity
                style={styles.repeatBtn}
                onPress={handlePrefillRepeat}>
                <Text style={styles.repeatText}>Prefill: {repeatLabel}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.repeatBtnSecondary}
                onPress={handleQuickRepeatSave}>
                <Text style={styles.repeatTextSecondary}>Save same</Text>
              </TouchableOpacity>
            </View>
          )}
        </FormSection>

        <FormSection title="How to log">
          <UnitToggle
            options={[
              { value: 'food' as EntryMode, label: 'Pick food' },
              { value: 'custom' as EntryMode, label: 'Custom kcal' },
            ]}
            value={entryMode}
            onChange={handleModeChange}
          />
        </FormSection>

        {entryMode === 'food' && (
          <FormSection title="Search food">
            <FoodSearchList
              variant="full"
              selectedId={selectedFood?.id}
              onSelect={handleSelectFood}
            />
            {selectedFood && (
              <View style={styles.selectedFood}>
                <Text style={styles.selectedLabel}>Selected</Text>
                <Text style={styles.selectedName}>{selectedFood.name}</Text>
                <Text style={styles.selectedMeta}>
                  {selectedFood.servingLabel} · {selectedFood.calories} kcal
                  {selectedFood.source === 'user'
                    ? ' · My food'
                    : selectedFood.sourceRef
                      ? ` · ${selectedFood.sourceRef}`
                      : ''}
                </Text>
              </View>
            )}
          </FormSection>
        )}

        <FormSection
          title={
            entryMode === 'food'
              ? 'Calories (adjust portion if needed)'
              : 'Calories'
          }>
          {entryMode === 'custom' && (
            <QuickCalorieChips onAdd={handleQuickAddCalories} />
          )}
          <View style={styles.caloriesInput}>
            <TextInput
              style={styles.input}
              value={calories}
              onChangeText={setCalories}
              placeholder="0"
              placeholderTextColor={colors.textSecondary}
              keyboardType="number-pad"
              editable={entryMode === 'custom' || selectedFood !== null}
            />
            <Text style={styles.suffix}>kcal</Text>
          </View>
          {entryMode === 'custom' && (
            <Text style={styles.hint}>
              Enter the total calories for this meal or snack.
            </Text>
          )}
        </FormSection>

        <Button
          title="Cancel"
          variant="secondary"
          onPress={() => navigation.goBack()}
          style={styles.cancelBtn}
        />
      </KeyboardAwareScreen>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.md,
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: colors.textSecondary,
  },
  dateLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  repeatBtn: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.chipBg,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  repeatBtnSecondary: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  repeatRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  repeatText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },
  repeatTextSecondary: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  selectedFood: {
    marginTop: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.chipBg,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  selectedLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  selectedName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  selectedMeta: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  caloriesInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 10,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
  },
  input: {
    flex: 1,
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
    paddingVertical: spacing.sm,
  },
  suffix: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  hint: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    lineHeight: 18,
  },
  cancelBtn: {
    marginTop: spacing.sm,
  },
});
