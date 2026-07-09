import React from 'react';
import {
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { EmptyState } from './EmptyState';
import { Icon, MEAL_ICONS } from './Icon';
import { colors, radii, spacing, typography } from '../constants/theme';
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
      <EmptyState
        icon="restaurant-outline"
        title="Nothing logged yet"
        message="Tap + to add your first entry."
      />
    );
  }

  const handleDelete = (entry: CalorieEntry) => {
    const label = entry.foodName
      ? `${entry.foodName} (${entry.calories} kcal)`
      : `${entry.calories} kcal`;
    Alert.alert('Delete entry', `Remove ${label}?`, [
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
          <View style={styles.groupHeader}>
            <Icon
              name={MEAL_ICONS[mealType]}
              size={16}
              color={colors.primary}
            />
            <Text style={styles.groupTitle}>{MEAL_LABELS[mealType]}</Text>
          </View>
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
  group: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: spacing.md,
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  groupTitle: {
    ...typography.overline,
    color: colors.textSecondary,
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
    ...typography.bodyMedium,
    color: colors.text,
    marginBottom: 2,
  },
  calories: {
    ...typography.label,
    fontSize: 15,
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
    ...typography.label,
    color: colors.primary,
  },
  deleteText: {
    ...typography.label,
    color: colors.error,
  },
});
