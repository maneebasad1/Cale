import React from 'react';
import {
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Icon } from './Icon';
import { colors, radii, spacing, typography } from '../constants/theme';
import type { WorkoutEntry } from '../types/workout';

interface WorkoutListProps {
  entries: WorkoutEntry[];
  onEdit?: (entry: WorkoutEntry) => void;
  onDelete?: (entryId: string) => void;
  iconActions?: boolean;
}

export function WorkoutList({
  entries,
  onEdit,
  onDelete,
  iconActions = false,
}: WorkoutListProps) {
  if (entries.length === 0) {
    return null;
  }

  const handleDelete = (entry: WorkoutEntry) => {
    Alert.alert(
      'Delete workout',
      `Remove ${entry.name} (${entry.caloriesBurned} kcal)?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => onDelete?.(entry.id),
        },
      ],
    );
  };

  return (
    <View style={styles.container}>
      {entries.map(entry => (
        <View key={entry.id} style={styles.row}>
          <View style={styles.rowMain}>
            <Text style={styles.name} numberOfLines={1}>
              {entry.name}
            </Text>
            <Text style={styles.meta}>
              {entry.caloriesBurned.toLocaleString()} kcal burned
              {entry.durationMinutes
                ? ` · ${entry.durationMinutes} min`
                : ''}
            </Text>
          </View>
          <View style={styles.actions}>
            {onEdit && (
              <TouchableOpacity
                onPress={() => onEdit(entry)}
                style={styles.actionBtn}
                accessibilityLabel="Edit workout">
                {iconActions ? (
                  <Icon name="create-outline" size={20} color={colors.primary} />
                ) : (
                  <Text style={styles.editText}>Edit</Text>
                )}
              </TouchableOpacity>
            )}
            {onDelete && (
              <TouchableOpacity
                onPress={() => handleDelete(entry)}
                style={styles.actionBtn}
                accessibilityLabel="Delete workout">
                {iconActions ? (
                  <Icon name="trash-outline" size={20} color={colors.error} />
                ) : (
                  <Text style={styles.deleteText}>Delete</Text>
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.md,
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
    ...typography.bodyMedium,
    color: colors.text,
  },
  meta: {
    ...typography.caption,
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
    color: colors.error,
  },
});
