import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { FormSection } from '../../components/onboarding/FormSection';
import { OnboardingFooter } from '../../components/onboarding/OnboardingFooter';
import { Button } from '../../components/Button';
import { EmptyState } from '../../components/EmptyState';
import { FoodSearchList } from '../../components/FoodSearchList';
import { Icon } from '../../components/Icon';
import { KeyboardAwareScreen } from '../../components/KeyboardAwareScreen';
import { MealChipSelector } from '../../components/MealChipSelector';
import { LabeledInput } from '../../components/LabeledInput';
import { QuickCalorieChips } from '../../components/QuickCalorieChips';
import { Screen } from '../../components/Screen';
import { UnitToggle } from '../../components/UnitToggle';
import { isOpenAiConfigured } from '../../config/openai';
import { colors, fonts, radii, spacing, typography } from '../../constants/theme';
import type { MainStackParamList } from '../../navigation/types';
import {
  getAiEstimateUsage,
  type AiEstimateUsage,
} from '../../services/aiUsageLimit';
import { resolveFoodById } from '../../services/foodService';
import { estimateMealCalories } from '../../services/mealEstimateService';
import { onMealsLogged } from '../../services/notificationService';
import {
  addEntry,
  getDailyLog,
  getProfile,
  updateEntry,
} from '../../services/storage';
import type { MealType } from '../../types';
import type { FoodItem } from '../../types/food';
import {
  MAX_ENTRY_CALORIES,
  addCaloriesCapped,
  getCalorieLimitError,
  sanitizeCalorieInput,
} from '../../utils/calorieLimits';
import { formatDisplayDate, isToday } from '../../utils/date';
import { getDefaultMealType } from '../../utils/mealTime';

type Nav = NativeStackNavigationProp<MainStackParamList, 'AddEntry'>;
type Route = RouteProp<MainStackParamList, 'AddEntry'>;
type PrimaryTab = 'describe' | 'custom';

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
  const { date, entryId, prefillFood, mealType: initialMealType } = route.params;
  const isEditing = Boolean(entryId);

  const aiEnabled = isOpenAiConfigured();

  const [mealType, setMealType] = useState<MealType>(
    () => initialMealType ?? getDefaultMealType(),
  );
  const [primaryTab, setPrimaryTab] = useState<PrimaryTab>(
    aiEnabled ? 'describe' : 'custom',
  );
  const [calories, setCalories] = useState('');
  const [customName, setCustomName] = useState('');
  const [mealDescription, setMealDescription] = useState('');
  const [estimateLoading, setEstimateLoading] = useState(false);
  const [estimateError, setEstimateError] = useState<string | null>(null);
  const [estimateNote, setEstimateNote] = useState<string | null>(null);
  const [aiUsage, setAiUsage] = useState<AiEstimateUsage | null>(null);
  const [selectedFoods, setSelectedFoods] = useState<FoodItem[]>([]);
  const [foodSearchOpen, setFoodSearchOpen] = useState(false);
  const [loaded, setLoaded] = useState(!entryId);
  const [entryMissing, setEntryMissing] = useState(false);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  /**
   * Food selection (ids) whose calories were last applied to the input. Lets
   * the sync effect below react only to real selection changes, so loading an
   * existing entry for edit keeps its saved calories.
   */
  const syncedSelectionRef = useRef('');

  const usingFoodDatabase = selectedFoods.length > 0;

  const logModeOptions = useMemo(
    () =>
      aiEnabled
        ? [
            {
              value: 'describe' as PrimaryTab,
              label: 'Describe (AI)',
              icon: 'sparkles-outline' as const,
            },
            { value: 'custom' as PrimaryTab, label: 'Custom kcal' },
          ]
        : [{ value: 'custom' as PrimaryTab, label: 'Custom kcal' }],
    [aiEnabled],
  );

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

  const refreshAiUsage = useCallback(async () => {
    if (!aiEnabled) {
      return;
    }
    const usage = await getAiEstimateUsage();
    setAiUsage(usage);
  }, [aiEnabled]);

  useEffect(() => {
    refreshAiUsage();
  }, [refreshAiUsage]);

  useEffect(() => {
    if (!aiUsage?.cooldownSeconds) {
      return;
    }
    const timer = setInterval(refreshAiUsage, 1000);
    return () => clearInterval(timer);
  }, [aiUsage?.cooldownSeconds, refreshAiUsage]);

  useEffect(() => {
    if (!prefillFood) {
      return;
    }
    setFoodSearchOpen(true);
    setSelectedFoods(prev => {
      if (isEditing) {
        // An edited entry holds exactly one food — replace it.
        return [prefillFood];
      }
      if (prev.some(food => food.id === prefillFood.id)) {
        return prev;
      }
      return [...prev, prefillFood];
    });
    navigation.setParams({ prefillFood: undefined });
  }, [prefillFood, navigation, isEditing]);

  useEffect(() => {
    const selectionKey = selectedIds.join('|');
    if (selectionKey === syncedSelectionRef.current) {
      return;
    }
    syncedSelectionRef.current = selectionKey;
    if (!usingFoodDatabase) {
      return;
    }
    if (isMulti) {
      setCalories(String(selectedTotal));
      return;
    }
    if (selectedFoods.length === 1) {
      setCalories(String(selectedFoods[0].calories));
    } else if (!isEditing) {
      setCalories('');
    }
  }, [
    usingFoodDatabase,
    isEditing,
    isMulti,
    selectedFoods,
    selectedIds,
    selectedTotal,
  ]);

  useEffect(() => {
    if (!entryId) {
      return;
    }

    getDailyLog(date).then(async log => {
      const entry = log.entries.find(e => e.id === entryId);
      if (!entry) {
        setEntryMissing(true);
        setLoaded(true);
        Alert.alert('Entry not found', 'This entry no longer exists.', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
        return;
      }

      setMealType(entry.mealType);
      setCalories(String(entry.calories));
      const mode = entry.entryMode ?? (entry.foodName ? 'food' : 'custom');

      if (mode === 'custom') {
        setPrimaryTab('custom');
        setCustomName(entry.foodName ?? '');
      } else if (entry.foodId || entry.foodName) {
        setFoodSearchOpen(true);
        const food = entry.foodId
          ? (await resolveFoodById(entry.foodId)) ?? foodFromEntry(entry)
          : foodFromEntry(entry);
        // Keep the entry's saved calories rather than the catalog value.
        syncedSelectionRef.current = food.id;
        setSelectedFoods([food]);
      }

      setLoaded(true);
    });
  }, [date, entryId, navigation]);

  const handleToggleFood = (food: FoodItem) => {
    setSelectedFoods(prev => {
      const exists = prev.some(item => item.id === food.id);
      if (exists) {
        return prev.filter(item => item.id !== food.id);
      }
      if (isEditing) {
        return [food];
      }
      return [...prev, food];
    });
  };

  const handlePrimaryTabChange = (tab: PrimaryTab) => {
    setPrimaryTab(tab);
    setEstimateError(null);
    setEstimateNote(null);
    setSelectedFoods([]);
    setFoodSearchOpen(false);
    if (!isEditing) {
      setCalories('');
      if (tab === 'custom') {
        setCustomName('');
        setMealDescription('');
      }
    }
  };

  const handleEstimateMeal = async () => {
    setEstimateError(null);
    setEstimateNote(null);
    setEstimateLoading(true);
    try {
      const result = await estimateMealCalories(mealDescription);
      if (result.error || !result.data) {
        setEstimateError(result.error ?? 'Could not estimate calories.');
        return;
      }

      setCalories(String(result.data.calories));
      setCustomName(result.data.summary);
      setEstimateNote(
        `AI estimate · ${result.data.confidence} confidence. Adjust if needed.`,
      );
    } finally {
      setEstimateLoading(false);
      await refreshAiUsage();
    }
  };

  const handleQuickAddCalories = (amount: number) => {
    const current = parseInt(calories, 10) || 0;
    setCalories(String(addCaloriesCapped(current, amount)));
  };

  const handleCaloriesChange = (text: string) => {
    setCalories(sanitizeCalorieInput(text));
  };

  const caloriesNum = parseInt(calories, 10) || 0;
  const caloriesError = isMulti
    ? selectedFoods
        .map(food => getCalorieLimitError(food.calories))
        .find(error => error !== null) ?? null
    : getCalorieLimitError(caloriesNum);

  const isValid =
    !entryMissing &&
    caloriesError === null &&
    (usingFoodDatabase
      ? selectedFoods.length > 0 && (isMulti || caloriesNum > 0)
      : caloriesNum > 0);

  /** Persists the entry/entries. Returns true when saved (and navigated back). */
  const saveEntries = useCallback(async (): Promise<boolean> => {
    if (usingFoodDatabase) {
      if (!selectedFoods.length) {
        return false;
      }

      if (entryId) {
        const food = selectedFoods[0];
        const num = parseInt(calories, 10) || food.calories;
        if (num <= 0 || num > MAX_ENTRY_CALORIES) {
          return false;
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
        return true;
      }

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
      return true;
    }

    const num = parseInt(calories, 10);
    if (!num || num <= 0 || num > MAX_ENTRY_CALORIES) {
      return false;
    }

    const name =
      primaryTab === 'describe'
        ? customName.trim() || mealDescription.trim() || undefined
        : customName.trim() || undefined;

    const payload = {
      mealType,
      calories: num,
      entryMode: 'custom' as const,
      foodName: name,
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
    return true;
  }, [
    calories,
    customName,
    date,
    entryId,
    mealDescription,
    mealType,
    navigation,
    primaryTab,
    selectedFoods,
    usingFoodDatabase,
  ]);

  const handleSave = useCallback(async () => {
    if (!isValid || savingRef.current) {
      return;
    }
    savingRef.current = true;
    setSaving(true);
    let saved = false;
    try {
      saved = await saveEntries();
    } finally {
      // After a successful save the screen is closing — keep the guard set so
      // a tap during the pop transition can't save a second copy.
      if (!saved) {
        savingRef.current = false;
        setSaving(false);
      }
    }
  }, [isValid, saveEntries]);

  if (!loaded) {
    return (
      <Screen edges={['bottom']}>
        <View style={styles.loading}>
          <Text style={styles.loadingText}>Loading…</Text>
        </View>
      </Screen>
    );
  }

  if (entryMissing) {
    return (
      <Screen edges={['bottom']}>
        <View style={[styles.loading, styles.missing]}>
          <EmptyState
            icon="alert-circle-outline"
            title="Entry not found"
            message="This entry no longer exists."
          />
          <Button title="Go back" onPress={() => navigation.goBack()} />
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

  const showPrimaryTabs = aiEnabled || logModeOptions.length > 1;

  return (
    <Screen edges={['bottom']}>
      <KeyboardAwareScreen
        contentContainerStyle={styles.content}
        footer={
          <OnboardingFooter
            title={saveTitle}
            onPress={handleSave}
            disabled={!isValid || saving}
            loading={saving}
          />
        }>
        <Text style={styles.dateLabel}>{dateLabel}</Text>

        <FormSection title="Meal">
          <MealChipSelector value={mealType} onChange={setMealType} />
        </FormSection>

        {showPrimaryTabs && (
          <FormSection title={aiEnabled ? 'AI calorie calculator' : 'How to log'}>
            <UnitToggle
              options={logModeOptions}
              value={primaryTab}
              onChange={handlePrimaryTabChange}
            />
          </FormSection>
        )}

        {!usingFoodDatabase && primaryTab === 'describe' && aiEnabled && (
          <FormSection title="What did you eat?">
            <Text style={styles.describeHint}>
              Describe your meal in plain words — AI estimates the calories for
              you.
            </Text>
            <TextInput
              style={styles.describeInput}
              value={mealDescription}
              onChangeText={text => {
                setMealDescription(text);
                setEstimateError(null);
                setEstimateNote(null);
              }}
              placeholder="e.g. 1 plate chicken biryani with raita"
              placeholderTextColor={colors.textSecondary}
              multiline
              textAlignVertical="top"
              accessibilityLabel="Meal description"
            />
            <Button
              title={
                estimateLoading
                  ? 'Estimating…'
                  : aiUsage?.cooldownSeconds
                    ? `Wait ${aiUsage.cooldownSeconds}s`
                    : 'Estimate calories'
              }
              onPress={handleEstimateMeal}
              loading={estimateLoading}
              disabled={
                !mealDescription.trim() ||
                estimateLoading ||
                (aiUsage !== null &&
                  (aiUsage.remaining <= 0 || aiUsage.cooldownSeconds > 0))
              }
              style={styles.estimateBtn}
            />
            {aiUsage ? (
              <Text style={styles.aiUsageHint}>
                {aiUsage.remaining > 0
                  ? `${aiUsage.remaining} of ${aiUsage.limit} AI estimates left today`
                  : `Daily limit reached (${aiUsage.limit}/day). Use Custom kcal or try again tomorrow.`}
              </Text>
            ) : null}
            {estimateError ? (
              <Text style={styles.estimateError}>{estimateError}</Text>
            ) : null}
            {estimateNote ? (
              <Text style={styles.estimateNote}>{estimateNote}</Text>
            ) : null}
          </FormSection>
        )}

        {!usingFoodDatabase && primaryTab === 'custom' && (
          <FormSection title="Manual entry">
            <LabeledInput
              label="Name (optional)"
              value={customName}
              onChangeText={setCustomName}
              placeholder="What did you eat? (optional)"
            />
            <QuickCalorieChips
              onAdd={handleQuickAddCalories}
              current={caloriesNum}
              max={MAX_ENTRY_CALORIES}
            />
          </FormSection>
        )}

        {!usingFoodDatabase && (
          <FormSection
            title={
              primaryTab === 'describe' ? 'Estimated calories' : 'Calories'
            }>
            {primaryTab === 'describe' && customName ? (
              <LabeledInput
                label="Meal name"
                value={customName}
                onChangeText={setCustomName}
                placeholder="Meal name"
              />
            ) : null}
            <View style={styles.caloriesInput}>
              <TextInput
                style={styles.input}
                value={calories}
                onChangeText={handleCaloriesChange}
                placeholder="0"
                placeholderTextColor={colors.textSecondary}
                keyboardType="number-pad"
              />
              <Text style={styles.suffix}>kcal</Text>
            </View>
            {caloriesError ? (
              <Text style={styles.estimateError}>{caloriesError}</Text>
            ) : null}
            {primaryTab === 'describe' ? (
              <Text style={styles.hint}>
                Tap Estimate calories, then adjust the total if needed.
              </Text>
            ) : (
              <Text style={styles.hint}>
                Total calories for this meal or snack.
              </Text>
            )}
          </FormSection>
        )}

        {usingFoodDatabase && (
          <FormSection
            title={
              isMulti ? 'Calories' : 'Calories (adjust if needed)'
            }>
            <View style={styles.caloriesInput}>
              <TextInput
                style={styles.input}
                value={calories}
                onChangeText={handleCaloriesChange}
                placeholder="0"
                placeholderTextColor={colors.textSecondary}
                keyboardType="number-pad"
                editable={selectedFoods.length === 1 && !isMulti}
              />
              <Text style={styles.suffix}>kcal</Text>
            </View>
            {caloriesError ? (
              <Text style={styles.estimateError}>{caloriesError}</Text>
            ) : null}
            {isMulti ? (
              <Text style={styles.hint}>
                Each food is saved as its own entry with its listed calories.
              </Text>
            ) : null}
          </FormSection>
        )}

        <View style={styles.foodDatabaseSection}>
          <TouchableOpacity
            style={[
              styles.foodDatabaseHeader,
              foodSearchOpen && styles.foodDatabaseHeaderOpen,
              usingFoodDatabase && styles.foodDatabaseHeaderActive,
            ]}
            onPress={() => setFoodSearchOpen(open => !open)}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityState={{ expanded: foodSearchOpen }}>
            <View style={styles.foodDatabaseHeaderLeft}>
              <Icon name="search-outline" size={18} color={colors.stone} />
              <View style={styles.foodDatabaseHeaderText}>
                <Text style={styles.foodDatabaseTitle}>Search food database</Text>
                <Text style={styles.foodDatabaseSubtitle}>
                  {usingFoodDatabase
                    ? `${selectedFoods.length} selected · USDA & your foods`
                    : 'Browse saved and built-in foods instead'}
                </Text>
              </View>
            </View>
            <Icon
              name={
                foodSearchOpen ? 'chevron-up-outline' : 'chevron-down-outline'
              }
              size={18}
              color={colors.stone}
            />
          </TouchableOpacity>

          {foodSearchOpen ? (
            <View style={styles.foodDatabaseBody}>
              {!isEditing ? (
                <Text style={styles.multiHint}>
                  Tap one or more foods to log from the database.
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
            </View>
          ) : null}
        </View>
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
  missing: {
    alignItems: 'stretch',
    padding: spacing.lg,
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
    marginBottom: spacing.sm,
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
  describeHint: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  aiUsageHint: {
    fontFamily: fonts.bodyMedium,
    fontSize: 11,
    lineHeight: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xs,
    marginBottom: spacing.xs,
  },
  describeInput: {
    minHeight: 120,
    backgroundColor: colors.background,
    borderRadius: radii.sm + 2,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontFamily: fonts.body,
    fontSize: 16,
    lineHeight: 22,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  estimateBtn: {
    marginBottom: spacing.xs,
  },
  estimateError: {
    ...typography.caption,
    color: colors.error,
    marginTop: spacing.xs,
  },
  estimateNote: {
    ...typography.caption,
    color: colors.primary,
    marginTop: spacing.xs,
  },
  foodDatabaseSection: {
    marginTop: spacing.md,
  },
  foodDatabaseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  foodDatabaseHeaderOpen: {
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  foodDatabaseHeaderActive: {
    borderColor: colors.primary,
    backgroundColor: colors.saffronMute,
  },
  foodDatabaseHeaderLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  foodDatabaseHeaderText: {
    flex: 1,
    gap: 2,
  },
  foodDatabaseTitle: {
    ...typography.label,
    color: colors.ink,
  },
  foodDatabaseSubtitle: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  foodDatabaseBody: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderTopWidth: 0,
    borderColor: colors.border,
    borderBottomLeftRadius: radii.md,
    borderBottomRightRadius: radii.md,
    padding: spacing.md,
    paddingTop: spacing.sm,
  },
});
