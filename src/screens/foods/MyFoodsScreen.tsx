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
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AddCustomFoodForm } from '../../components/AddCustomFoodForm';
import { Button } from '../../components/Button';
import { EmptyState } from '../../components/EmptyState';
import { Screen } from '../../components/Screen';
import { colors, fonts, radii, spacing, typography } from '../../constants/theme';
import type { MainStackParamList } from '../../navigation/types';
import {
  deleteCustomFood,
  getCustomFoods,
} from '../../services/customFoodService';
import type { FoodItem } from '../../types/food';

type Nav = NativeStackNavigationProp<MainStackParamList, 'MyFoods'>;

export function MyFoodsScreen() {
  const navigation = useNavigation<Nav>();
  const [foods, setFoods] = useState<FoodItem[]>([]);
  const [refreshing, setRefreshing] = useState(false);
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

  const handleSaved = async () => {
    setEditingFood(null);
    await loadFoods();
  };

  const handleEdit = (food: FoodItem) => {
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
              setEditingFood(null);
            }
            await loadFoods();
          },
        },
      ],
    );
  };

  return (
    <Screen edges={['bottom']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }>
        <Text style={styles.description}>
          Foods you save here show up in search when you log a meal.
        </Text>

        {!editingFood && (
          <Button
            title="Add food"
            onPress={() => navigation.navigate('AddCustomFood')}
            style={styles.addBtn}
          />
        )}

        {editingFood && (
          <AddCustomFoodForm
            food={editingFood}
            onSaved={handleSaved}
            onCancel={() => setEditingFood(null)}
          />
        )}

        {foods.length === 0 ? (
          <EmptyState
            icon="nutrition-outline"
            title="Your kitchen shelf is empty"
            message="Save homemade dishes and go-to meals so logging takes seconds."
          />
        ) : (
          <View style={styles.list}>
            <Text style={styles.listTitle}>
              Your foods · {foods.length}
            </Text>
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
    ...typography.body,
    fontSize: 14,
    lineHeight: 20,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  addBtn: {
    minHeight: 48,
    marginBottom: spacing.lg,
  },
  list: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg - 2,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: spacing.md,
  },
  listTitle: {
    ...typography.overline,
    color: colors.textSecondary,
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
    ...typography.label,
    color: colors.text,
  },
  meta: {
    ...typography.caption,
    fontFamily: fonts.body,
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
    ...typography.label,
    color: colors.primary,
  },
  deleteText: {
    ...typography.label,
    color: colors.chili,
  },
});
