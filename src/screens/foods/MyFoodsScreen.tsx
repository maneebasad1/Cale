import React, { useCallback, useState } from 'react';
import {
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { AddCustomFoodForm } from '../../components/AddCustomFoodForm';
import { Button } from '../../components/Button';
import { Screen } from '../../components/Screen';
import { colors, spacing } from '../../constants/theme';
import {
  deleteCustomFood,
  getCustomFoods,
} from '../../services/customFoodService';
import type { FoodItem } from '../../types/food';

export function MyFoodsScreen() {
  const [foods, setFoods] = useState<FoodItem[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingFood, setEditingFood] = useState<FoodItem | null>(null);

  const loadFoods = useCallback(async () => {
    const items = await getCustomFoods();
    setFoods(items);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadFoods();
    }, [loadFoods]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadFoods();
    setRefreshing(false);
  };

  const closeForm = () => {
    setShowAddForm(false);
    setEditingFood(null);
  };

  const handleSaved = async () => {
    closeForm();
    await loadFoods();
  };

  const handleEdit = (food: FoodItem) => {
    setShowAddForm(false);
    setEditingFood(food);
  };

  const handleDelete = (food: FoodItem) => {
    Alert.alert(
      'Delete food',
      `Remove "${food.name}" from your saved foods?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteCustomFood(food.id);
            if (editingFood?.id === food.id) {
              closeForm();
            }
            await loadFoods();
          },
        },
      ],
    );
  };

  const formVisible = showAddForm || editingFood !== null;

  return (
    <Screen edges={['bottom']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }>
        <Text style={styles.description}>
          Foods you save here appear in search when logging meals.
        </Text>

        {!formVisible && (
          <Button
            title="+ Add food"
            onPress={() => {
              setEditingFood(null);
              setShowAddForm(true);
            }}
            style={styles.addBtn}
          />
        )}

        {formVisible && (
          <AddCustomFoodForm
            food={editingFood ?? undefined}
            onSaved={handleSaved}
            onCancel={closeForm}
          />
        )}

        {foods.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No saved foods yet</Text>
            <Text style={styles.emptyText}>
              Add your go-to meals here for faster logging.
            </Text>
          </View>
        ) : (
          <View style={styles.list}>
            <Text style={styles.listTitle}>Your foods ({foods.length})</Text>
            {foods.map(food => (
              <View key={food.id} style={styles.row}>
                <View style={styles.rowMain}>
                  <Text style={styles.name} numberOfLines={1}>
                    {food.name}
                  </Text>
                  <Text style={styles.meta}>
                    {food.servingLabel} · {food.calories} kcal
                  </Text>
                </View>
                <View style={styles.actions}>
                  <TouchableOpacity
                    onPress={() => handleEdit(food)}
                    style={styles.actionBtn}>
                    <Text style={styles.editText}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleDelete(food)}
                    style={styles.actionBtn}>
                    <Text style={styles.deleteText}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: {
    padding: spacing.lg,
    paddingBottom: spacing.xl,
  },
  description: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  addBtn: {
    minHeight: 48,
    marginBottom: spacing.lg,
  },
  empty: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  list: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  listTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  rowMain: {
    flex: 1,
    marginRight: spacing.sm,
  },
  name: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  meta: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionBtn: {
    padding: spacing.xs,
  },
  editText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '500',
  },
  deleteText: {
    color: colors.error,
    fontSize: 14,
    fontWeight: '500',
  },
});
