import React, { useCallback, useEffect, useRef, useState } from 'react';
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
import { useFocusEffect } from '@react-navigation/native';
import { FrequentFoodsRow } from './FrequentFoodsRow';
import { Icon } from './Icon';
import { getFrequentFoods } from '../services/frequentFoods';
import {
  mergeFoodResults,
  searchSavedFoods,
  searchUsdaFoods,
} from '../services/foodService';
import type { FoodItem } from '../types/food';
import { FOOD_REGION_LABELS } from '../types/food';
import { colors, fonts, radii, spacing, typography } from '../constants/theme';

interface FoodSearchListProps {
  /** Selected food ids (supports one or many). */
  selectedIds?: string[];
  onSelect: (food: FoodItem) => void;
  variant?: 'compact' | 'full';
  /** Show the "Your usual" frequent-foods row. Default true. */
  showFrequent?: boolean;
  /** Called when the user taps "Add your own food". */
  onAddOwnFood?: () => void;
  /** When true, rows show checkbox affordance for multi-pick. Default true. */
  multiSelect?: boolean;
}

export function FoodSearchList({
  selectedIds = [],
  onSelect,
  variant = 'compact',
  showFrequent = true,
  onAddOwnFood,
  multiSelect = true,
}: FoodSearchListProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<FoodItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [remoteLoading, setRemoteLoading] = useState(false);
  const [remoteError, setRemoteError] = useState<string | null>(null);
  const latestRequestRef = useRef(0);
  const [refreshKey, setRefreshKey] = useState(0);
  const [frequentFoods, setFrequentFoods] = useState<FoodItem[]>([]);
  const selectedSet = new Set(selectedIds);

  useFocusEffect(
    useCallback(() => {
      setRefreshKey(k => k + 1);
    }, []),
  );

  useEffect(() => {
    if (!showFrequent) {
      return;
    }
    getFrequentFoods().then(setFrequentFoods);
  }, [refreshKey, showFrequent]);

  const loadResults = useCallback(async (searchQuery: string) => {
    const requestId = latestRequestRef.current + 1;
    latestRequestRef.current = requestId;
    const isLatest = () => latestRequestRef.current === requestId;

    setLoading(true);
    setRemoteLoading(false);
    setRemoteError(null);
    try {
      // Saved + built-in foods first so they show while USDA loads.
      const saved = await searchSavedFoods(searchQuery);
      if (!isLatest()) {
        return;
      }
      setResults(saved);
      setLoading(false);

      if (searchQuery.trim().length < 2) {
        return;
      }
      setRemoteLoading(true);
      const usda = await searchUsdaFoods(searchQuery);
      if (!isLatest()) {
        return;
      }
      setResults(mergeFoodResults(saved, usda.items));
      setRemoteError(usda.error);
    } catch {
      if (isLatest()) {
        setRemoteError('Search failed');
      }
    } finally {
      if (isLatest()) {
        setLoading(false);
        setRemoteLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => loadResults(query), query ? 300 : 0);
    return () => clearTimeout(timer);
  }, [query, refreshKey, loadResults]);

  const getMetaLabel = (item: FoodItem) => {
    if (item.source === 'user') {
      return `My food · ${item.servingLabel}`;
    }
    const region = FOOD_REGION_LABELS[item.region];
    const source = item.source === 'usda' ? ' · USDA' : '';
    return `${region} · ${item.servingLabel}${source}`;
  };

  const emptyMessage = query.trim()
    ? remoteError
      ? 'Online search is unavailable and no saved foods matched. Try again later, or add your own food.'
      : 'Nothing matched. Try another name, or add your own food.'
    : multiSelect
      ? 'Search and tap foods to add them to this meal.'
      : 'Search the catalog, or add a food you cook often.';

  const emptyTitle = query.trim()
    ? remoteError
      ? 'Online search unavailable'
      : 'No matches'
    : 'Find a food';

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
    const selected = selectedSet.has(item.id);
    return (
      <TouchableOpacity
        key={item.id}
        style={[styles.row, selected && styles.rowSelected]}
        onPress={() => onSelect(item)}
        activeOpacity={0.7}
        accessibilityRole={multiSelect ? 'checkbox' : 'button'}
        accessibilityState={{ selected }}>
        {multiSelect ? (
          <View style={[styles.check, selected && styles.checkSelected]}>
            {selected ? (
              <Icon name="checkmark-circle" size={22} color={colors.primary} />
            ) : (
              <View style={styles.checkEmpty} />
            )}
          </View>
        ) : null}
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

      {onAddOwnFood ? (
        <TouchableOpacity
          style={styles.addOwnBtn}
          onPress={onAddOwnFood}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Add your own food">
          <Icon name="add" size={16} color={colors.primary} />
          <Text style={styles.addOwnText}>Add your own food</Text>
        </TouchableOpacity>
      ) : null}

      {showFrequent && !query && frequentFoods.length > 0 ? (
        <FrequentFoodsRow
          foods={frequentFoods}
          selectedIds={selectedIds}
          onSelect={onSelect}
        />
      ) : null}

      {remoteLoading && results.length > 0 ? (
        <View style={styles.statusRow}>
          <ActivityIndicator color={colors.primary} size="small" />
          <Text style={styles.statusText}>Searching USDA…</Text>
        </View>
      ) : remoteError && results.length > 0 ? (
        <View style={styles.statusRow}>
          <Icon
            name="alert-circle-outline"
            size={14}
            color={colors.textSecondary}
          />
          <Text style={styles.statusText}>
            Online search unavailable — showing saved foods
          </Text>
        </View>
      ) : null}

      {(loading || remoteLoading) && results.length === 0 ? (
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
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: spacing.xs,
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
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  statusText: {
    ...typography.caption,
    color: colors.textSecondary,
    flexShrink: 1,
  },
  listCompact: {
    maxHeight: 160,
  },
  listFull: {
    maxHeight: 220,
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
    gap: spacing.sm,
  },
  rowSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.noriMute,
  },
  check: {
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkSelected: {},
  checkEmpty: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.border,
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
