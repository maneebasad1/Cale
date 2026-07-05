import React, { useCallback, useState } from 'react';
import {
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Button } from '../../components/Button';
import { KeyboardAwareScreen } from '../../components/KeyboardAwareScreen';
import { LabeledInput } from '../../components/LabeledInput';
import { Screen } from '../../components/Screen';
import { colors, spacing } from '../../constants/theme';
import { getProfile, saveProfile } from '../../services/storage';
import {
  addWeightEntry,
  deleteWeightEntry,
  getWeightEntries,
} from '../../services/weightService';
import type { WeightEntry } from '../../types/weight';
import { displayWeight, lbToKg } from '../../utils/units';
import { buildUpdatedProfile } from '../../utils/profileSave';

export function ProfileWeightScreen() {
  const [weightUnit, setWeightUnit] = useState<'kg' | 'lb'>('kg');
  const [weightEntries, setWeightEntries] = useState<WeightEntry[]>([]);
  const [newWeight, setNewWeight] = useState('');
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    const profile = await getProfile();
    if (profile) {
      setWeightUnit(profile.weightUnit);
    }
    const entries = await getWeightEntries();
    setWeightEntries(entries);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData]),
  );

  const handleLogWeight = async () => {
    const weightNum = parseFloat(newWeight);
    if (!weightNum) {
      Alert.alert('Invalid input', 'Please enter a valid weight.');
      return;
    }

    const weightKg = weightUnit === 'kg' ? weightNum : lbToKg(weightNum);

    setSaving(true);
    try {
      await addWeightEntry(weightKg);
      const profile = await getProfile();
      if (profile) {
        const updated = buildUpdatedProfile(profile, { weightKg });
        await saveProfile(updated);
      }
      setNewWeight('');
      await loadData();
      Alert.alert('Weight logged', 'Your weight has been recorded.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (entry: WeightEntry) => {
    Alert.alert('Delete entry', `Remove weight from ${entry.date}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => deleteWeightEntry(entry.id).then(loadData),
      },
    ]);
  };

  return (
    <Screen edges={[]}>
      <KeyboardAwareScreen contentContainerStyle={styles.container}>
        <Text style={styles.sectionLabel}>Log weight</Text>
        <LabeledInput
          label=""
          value={newWeight}
          onChangeText={setNewWeight}
          keyboardType="numeric"
          suffix={weightUnit}
        />
        <Button
          title="Log today's weight"
          onPress={handleLogWeight}
          loading={saving}
          style={styles.logBtn}
        />

        <Text style={styles.sectionLabel}>Weight history</Text>
        {weightEntries.length === 0 ? (
          <Text style={styles.emptyText}>No weight entries yet.</Text>
        ) : (
          <View style={styles.weightList}>
            {weightEntries.map((entry, index) => (
              <View
                key={entry.id}
                style={[styles.weightRow, index > 0 && styles.weightRowBorder]}>
                <Text style={styles.weightDate}>{entry.date}</Text>
                <Text style={styles.weightValue}>
                  {displayWeight(entry.weightKg, weightUnit)}
                </Text>
                <TouchableOpacity onPress={() => handleDelete(entry)}>
                  <Text style={styles.weightDelete}>Delete</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </KeyboardAwareScreen>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.lg,
    paddingBottom: spacing.xl,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.sm,
    marginTop: spacing.sm,
  },
  logBtn: {
    marginBottom: spacing.lg,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  weightList: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  weightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  weightRowBorder: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  weightDate: {
    flex: 1,
    fontSize: 14,
    color: colors.textSecondary,
  },
  weightValue: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    marginRight: spacing.md,
  },
  weightDelete: {
    fontSize: 13,
    color: colors.error,
  },
});
