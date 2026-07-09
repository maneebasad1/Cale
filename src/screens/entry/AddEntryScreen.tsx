import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { FormSection } from '../../components/onboarding/FormSection';
import { OnboardingFooter } from '../../components/onboarding/OnboardingFooter';
import { FoodSearchList } from '../../components/FoodSearchList';
import { KeyboardAwareScreen } from '../../components/KeyboardAwareScreen';
import { MealChipSelector } from '../../components/MealChipSelector';
import { QuickCalorieChips } from '../../components/QuickCalorieChips';
import { Screen } from '../../components/Screen';
import { UnitToggle } from '../../components/UnitToggle';
import { colors, fonts, radii, spacing, typography } from '../../constants/theme';
import type { MainStackParamList } from '../../navigation/types';
import { resolveFoodById } from '../../services/foodService';
import { onMealsLogged } from '../../services/notificationService';
import {
  addEntry,
  getDailyLog,
  getProfile,
  updateEntry,
} from '../../services/storage';
import type { MealType } from '../../types';
import type { EntryMode, FoodItem } from '../../types/food';
import { formatDisplayDate, isToday } from '../../utils/date';

type Nav = NativeStackNavigationProp<MainStackParamList, 'AddEntry'>;
type Route = RouteProp<MainStackParamList, 'AddEntry'>;

function foodFromEntry(entry: {
  foodId?: string;
  foodName?: string;
  calories: number;
  servingLabel?: string;
}): FoodItem {
  return {
    id: entry.foodId ?? 'custom-food',
    name: entry.foodName ?? 'Food',
    calories: entry.calories,
    servingLabel: entry.servingLabel ?? '',
    region: 'general',
    source: entry.foodId?.startsWith('user-') ? 'user' : 'local',
  };
}

export function AddEntryScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { date, entryId, prefillFood } = route.params;
  const isEditing = Boolean(entryId);

  const [mealType, setMealType] = useState<MealType>('breakfast');
  const [entryMode, setEntryMode] = useState<EntryMode>('food');
  const [calories, setCalories] = useState('');
  const [selectedFoods, setSelectedFoods] = useState<FoodItem[]>([]);
  const [loaded, setLoaded] = useState(!entryId);

  const selectedIds = useMemo(
    () => selectedFoods.map(food => food.id),
    [selectedFoods],
  );
  const selectedTotal = useMemo(
    () => selectedFoods.reduce((sum, food) => sum + food.calories, 0),
    [selectedFoods],
  );
  const isMulti = !isEditing && selectedFoods.length > 1;

  useEffect(() => {
    navigation.setOptions({
      title: isEditing ? 'Edit entry' : 'Add entry',
    });
  }, [navigation, isEditing]);

  // Returning from Add food screen — add/select the new food and clear the param.
  useEffect(() => {
    if (!prefillFood) {
      return;
    }
    setEntryMode('food');
    setSelectedFoods(prev => {
      if (prev.some(food => food.id === prefillFood.id)) {
        return prev;
      }
      return [...prev, prefillFood];
    });
    navigation.setParams({ prefillFood: undefined });
  }, [prefillFood, navigation]);

  useEffect(() => {
    if (entryMode !== 'food') {
      return;
    }
    if (isMulti) {
      setCalories(String(selectedTotal));
      return;
    }
    if (selectedFoods.length === 1) {
      setCalories(String(selectedFoods[0].calories));
    } else if (selectedFoods.length === 0 && !isEditing) {
      setCalories('');
    }
  }, [entryMode, isEditing, isMulti, selectedFoods, selectedTotal]);

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
        setSelectedFoods([
          resolved ?? foodFromEntry(entry),
        ]);
      } else if (entry.foodName) {
        setSelectedFoods([foodFromEntry(entry)]);
      }

      setLoaded(true);
    });
  }, [date, entryId]);

  const handleToggleFood = (food: FoodItem) => {
    setSelectedFoods(prev => {
      const exists = prev.some(item => item.id === food.id);
      if (exists) {
        return prev.filter(item => item.id !== food.id);
      }
      // Editing a single entry — replace selection.
      if (isEditing) {
        return [food];
      }
      return [...prev, food];
    });
  };

  const handleModeChange = (mode: EntryMode) => {
    setEntryMode(mode);
    if (mode === 'custom') {
      setSelectedFoods([]);
      if (!isEditing) {
        setCalories('');
      }
    } else if (selectedFoods.length === 0) {
      setCalories('');
    }
  };

  const handleQuickAddCalories = (amount: number) => {
    const current = parseInt(calories, 10) || 0;
    setCalories(String(current + amount));
  };

  const isValid =
    entryMode === 'custom'
      ? parseInt(calories, 10) > 0
      : selectedFoods.length > 0 &&
        (isMulti || parseInt(calories, 10) > 0);

  const handleSave = useCallback(async () => {
    if (entryMode === 'custom') {
      const num = parseInt(calories, 10);
      if (!num || num <= 0) {
        return;
      }
      const payload = {
        mealType,
        calories: num,
        entryMode: 'custom' as const,
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
      return;
    }

    if (!selectedFoods.length) {
      return;
    }

    // Edit: one entry, allow adjusted calories.
    if (entryId) {
      const food = selectedFoods[0];
      const num = parseInt(calories, 10) || food.calories;
      if (num <= 0) {
        return;
      }
      await updateEntry(date, entryId, {
        mealType,
        calories: num,
        entryMode: 'food',
        foodName: food.name,
        foodId: food.id,
        servingLabel: food.servingLabel,
      });
      navigation.goBack();
      return;
    }

    // Add: one log entry per selected food (keeps each item distinct in Today's log).
    for (let i = 0; i < selectedFoods.length; i += 1) {
      const food = selectedFoods[i];
      const kcal =
        selectedFoods.length === 1
          ? parseInt(calories, 10) || food.calories
          : food.calories;
      await addEntry(date, {
        mealType,
        calories: kcal,
        entryMode: 'food',
        foodName: food.name,
        foodId: food.id,
        servingLabel: food.servingLabel,
      });
    }

    const profile = await getProfile();
    if (profile) {
      await onMealsLogged(profile);
    }
    navigation.goBack();
  }, [
    calories,
    date,
    entryId,
    entryMode,
    mealType,
    navigation,
    selectedFoods,
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

  const saveTitle = isEditing
    ? 'Save changes'
    : selectedFoods.length > 1
      ? `Save ${selectedFoods.length} entries`
      : 'Save entry';

  return (
    <Screen edges={['bottom']}>
      <KeyboardAwareScreen
        contentContainerStyle={styles.content}
        footer={
          <OnboardingFooter
            title={saveTitle}
            onPress={handleSave}
            disabled={!isValid}
          />
        }>
        <Text style={styles.dateLabel}>{dateLabel}</Text>

        <FormSection title="Meal">
          <MealChipSelector value={mealType} onChange={setMealType} />
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
            {!isEditing ? (
              <Text style={styles.multiHint}>
                Tap one or more foods to add them to this meal.
              </Text>
            ) : null}
            <FoodSearchList
              variant="full"
              selectedIds={selectedIds}
              onSelect={handleToggleFood}
              showFrequent={false}
              multiSelect={!isEditing}
              onAddOwnFood={() =>
                navigation.navigate('AddCustomFood', {
                  selectOnSave: true,
                  returnDate: date,
                  returnEntryId: entryId,
                })
              }
            />
          </FormSection>
        )}

        <FormSection
          title={
            entryMode === 'food'
              ? isMulti
                ? 'Calories'
                : 'Calories (adjust if needed)'
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
              editable={
                entryMode === 'custom' ||
                (selectedFoods.length === 1 && !isMulti)
              }
            />
            <Text style={styles.suffix}>kcal</Text>
          </View>
          {entryMode === 'custom' && (
            <Text style={styles.hint}>
              Total calories for this meal or snack.
            </Text>
          )}
          {isMulti ? (
            <Text style={styles.hint}>
              Each food is saved as its own entry with its listed calories.
            </Text>
          ) : null}
        </FormSection>
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
    ...typography.body,
    color: colors.textSecondary,
  },
  dateLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  multiHint: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  caloriesInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: radii.sm + 2,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
  },
  input: {
    flex: 1,
    fontFamily: fonts.displayBold,
    fontSize: 28,
    lineHeight: 34,
    color: colors.text,
    paddingVertical: spacing.sm,
  },
  suffix: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
  },
  hint: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
});
