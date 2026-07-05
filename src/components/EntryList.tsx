import React from 'react';
import {
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Icon } from './Icon';
import { colors, spacing } from '../constants/theme';
import type { CalorieEntry } from '../types';
import { MEAL_LABELS, MEAL_TYPES } from '../types';

interface EntryListProps {
  entries: CalorieEntry[];
  onEdit?: (entry: CalorieEntry) => void;
  onDelete?: (entryId: string) => void;
  iconActions?: boolean;
}

export function EntryList({
  entries,
  onEdit,
  onDelete,
  iconActions = false,
}: EntryListProps) {
  const grouped = MEAL_TYPES.map(mealType => ({
    mealType,
    items: entries.filter(e => e.mealType === mealType),
  })).filter(g => g.items.length > 0);

  if (grouped.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>No entries yet. Tap + to add one.</Text>
      </View>
    );
  }

  const handleDelete = (entry: CalorieEntry) => {
    const label = entry.foodName
      ? `${entry.foodName} (${entry.calories} kcal)`
      : `${entry.calories} kcal`;
    Alert.alert('Delete Entry', `Remove ${label}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => onDelete?.(entry.id),
      },
    ]);
  };

  return (
    <View style={styles.container}>
      {grouped.map(({ mealType, items }) => (
        <View key={mealType} style={styles.group}>
          <Text style={styles.groupTitle}>{MEAL_LABELS[mealType]}</Text>
          {items.map(entry => (
            <View key={entry.id} style={styles.row}>
              <View style={styles.rowMain}>
                {entry.foodName ? (
                  <Text style={styles.foodName} numberOfLines={1}>
                    {entry.foodName}
                  </Text>
                ) : null}
                <Text style={styles.calories}>{entry.calories} kcal</Text>
              </View>
              <View style={styles.actions}>
                {onEdit && (
                  <TouchableOpacity
                    onPress={() => onEdit(entry)}
                    style={[
                      styles.actionBtn,
                      iconActions && styles.iconActionBtn,
                    ]}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    accessibilityLabel="Edit entry">
                    {iconActions ? (
                      <Icon
                        name="create-outline"
                        size={20}
                        color={colors.primary}
                      />
                    ) : (
                      <Text style={styles.editText}>Edit</Text>
                    )}
                  </TouchableOpacity>
                )}
                {onDelete && (
                  <TouchableOpacity
                    onPress={() => handleDelete(entry)}
                    style={[
                      styles.actionBtn,
                      iconActions && styles.iconActionBtn,
                    ]}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    accessibilityLabel="Delete entry">
                    {iconActions ? (
                      <Icon
                        name="trash-outline"
                        size={20}
                        color={colors.error}
                      />
                    ) : (
                      <Text style={styles.deleteText}>Delete</Text>
                    )}
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
  },
  empty: {
    padding: spacing.lg,
    alignItems: 'center',
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: 15,
  },
  group: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
  },
  groupTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  rowMain: {
    flex: 1,
    marginRight: spacing.sm,
  },
  foodName: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.text,
    marginBottom: 2,
  },
  calories: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.text,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
  },
  actionBtn: {
    padding: spacing.xs,
  },
  iconActionBtn: {
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
