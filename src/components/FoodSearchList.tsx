import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { AddCustomFoodForm } from './AddCustomFoodForm';
import { FrequentFoodsRow } from './FrequentFoodsRow';
import { Icon } from './Icon';
import { getFrequentFoods } from '../services/frequentFoods';
import { searchFoods } from '../services/foodService';
import type { FoodItem } from '../types/food';
import { FOOD_REGION_LABELS } from '../types/food';
import { colors, fonts, radii, spacing, typography } from '../constants/theme';

interface FoodSearchListProps {
  selectedId?: string | null;
  onSelect: (food: FoodItem) => void;
  variant?: 'compact' | 'full';
}

export function FoodSearchList({
  selectedId,
  onSelect,
  variant = 'compact',
}: FoodSearchListProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<FoodItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [frequentFoods, setFrequentFoods] = useState<FoodItem[]>([]);

  useEffect(() => {
    getFrequentFoods().then(setFrequentFoods);
  }, [refreshKey]);

  const loadResults = useCallback(async (searchQuery: string) => {
    setLoading(true);
    const items = await searchFoods(searchQuery);
    setResults(items);
    setLoading(false);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => loadResults(query), query ? 300 : 0);
    return () => clearTimeout(timer);
  }, [query, refreshKey, loadResults]);

  const handleCustomFoodSaved = (food: FoodItem) => {
    setShowAddForm(false);
    setRefreshKey(k => k + 1);
    onSelect(food);
  };

  const getMetaLabel = (item: FoodItem) => {
    if (item.source === 'user') {
      return `My food · ${item.servingLabel}`;
    }
    const region = FOOD_REGION_LABELS[item.region];
    const source = item.source === 'usda' ? ' · USDA' : '';
    return `${region} · ${item.servingLabel}${source}`;
  };

  const emptyMessage = query.trim()
    ? 'Nothing matched. Try another name, or add your own food.'
    : 'Search the catalog, or add a food you cook often.';

  const emptyTitle = query.trim() ? 'No matches' : 'Find a food';

  const renderEmpty = () => (
    <View style={styles.empty}>
      <View style={styles.emptyIcon}>
        <Icon name="search-outline" size={22} color={colors.primary} />
      </View>
      <Text style={styles.emptyTitle}>{emptyTitle}</Text>
      <Text style={styles.emptyMessage}>{emptyMessage}</Text>
    </View>
  );

  const renderItem = (item: FoodItem) => {
    const selected = selectedId === item.id;
    return (
      <TouchableOpacity
        key={item.id}
        style={[styles.row, selected && styles.rowSelected]}
        onPress={() => onSelect(item)}
        activeOpacity={0.7}>
        <View style={styles.rowText}>
          <Text style={[styles.name, selected && styles.nameSelected]}>
            {item.name}
          </Text>
          <Text style={styles.meta}>{getMetaLabel(item)}</Text>
        </View>
        <Text style={[styles.calories, selected && styles.caloriesSelected]}>
          {item.calories}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.searchInput}
        value={query}
        onChangeText={setQuery}
        placeholder="Search foods or your saved items…"
        placeholderTextColor={colors.textSecondary}
        autoCorrect={false}
      />

      {!showAddForm ? (
        <TouchableOpacity
          style={styles.addOwnBtn}
          onPress={() => setShowAddForm(true)}
          activeOpacity={0.7}>
          <Text style={styles.addOwnText}>+ Add your own food</Text>
        </TouchableOpacity>
      ) : (
        <AddCustomFoodForm
          onSaved={handleCustomFoodSaved}
          onCancel={() => setShowAddForm(false)}
        />
      )}

      {!query && frequentFoods.length > 0 && (
        <FrequentFoodsRow
          foods={frequentFoods}
          selectedId={selectedId}
          onSelect={onSelect}
        />
      )}

      {loading ? (
        <ActivityIndicator
          style={styles.loader}
          color={colors.primary}
          size="small"
        />
      ) : variant === 'full' ? (
        <ScrollView
          style={styles.listFull}
          nestedScrollEnabled
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator>
          {results.length === 0 ? renderEmpty() : results.map(renderItem)}
        </ScrollView>
      ) : (
        <FlatList
          data={results}
          keyExtractor={item => item.id}
          style={styles.listCompact}
          keyboardShouldPersistTaps="handled"
          nestedScrollEnabled
          ListEmptyComponent={renderEmpty()}
          renderItem={({ item }) => renderItem(item)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: spacing.sm,
  },
  searchInput: {
    backgroundColor: colors.background,
    borderRadius: radii.sm + 2,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    ...typography.body,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  addOwnBtn: {
    alignSelf: 'flex-start',
    marginBottom: spacing.sm,
    paddingVertical: spacing.xs,
  },
  addOwnText: {
    ...typography.label,
    color: colors.primary,
  },
  loader: {
    padding: spacing.md,
  },
  listCompact: {
    maxHeight: 160,
  },
  listFull: {
    maxHeight: 200,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
  },
  emptyIcon: {
    width: 40,
    height: 40,
    borderRadius: radii.full,
    backgroundColor: colors.noriMute,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  emptyTitle: {
    ...typography.label,
    color: colors.text,
    textAlign: 'center',
    marginBottom: 2,
  },
  emptyMessage: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.sm + 2,
    marginBottom: spacing.xs,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rowSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.noriMute,
  },
  rowText: {
    flex: 1,
    marginRight: spacing.sm,
  },
  name: {
    ...typography.label,
    color: colors.text,
  },
  nameSelected: {
    color: colors.primaryDark,
  },
  meta: {
    ...typography.caption,
    fontFamily: fonts.body,
    color: colors.textSecondary,
    marginTop: 2,
  },
  calories: {
    ...typography.heading,
    fontSize: 16,
    lineHeight: 20,
    color: colors.text,
  },
  caloriesSelected: {
    color: colors.primary,
  },
});
