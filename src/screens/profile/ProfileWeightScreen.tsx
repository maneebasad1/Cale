import React, { useCallback, useRef, useState } from 'react';
import {
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Button } from '../../components/Button';
import { Icon } from '../../components/Icon';
import { KeyboardAwareScreen } from '../../components/KeyboardAwareScreen';
import { LabeledInput } from '../../components/LabeledInput';
import { Screen } from '../../components/Screen';
import { colors, fonts, radii, spacing, typography } from '../../constants/theme';
import { useApp } from '../../context/AppContext';
import { getProfile } from '../../services/storage';
import {
  addWeightEntry,
  deleteWeightEntry,
  getLatestWeightEntry,
  getWeightEntries,
} from '../../services/weightService';
import type { WeightEntry } from '../../types/weight';
import { displayWeight, lbToKg } from '../../utils/units';
import { validateWeightKg } from '../../utils/bodyValidation';
import { parseDecimal } from '../../utils/parseDecimal';
import { syncProfileWeight } from '../../utils/profileWeightSync';

export function ProfileWeightScreen() {
  const [weightUnit, setWeightUnit] = useState<'kg' | 'lb'>('kg');
  const [weightEntries, setWeightEntries] = useState<WeightEntry[]>([]);
  const [newWeight, setNewWeight] = useState('');
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const { refreshProfile } = useApp();

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
    if (savingRef.current) {
      return;
    }

    const weightNum = parseDecimal(newWeight);
    const weightKg = weightUnit === 'kg' ? weightNum : lbToKg(weightNum);
    const error = validateWeightKg(weightKg, weightUnit);
    if (error) {
      Alert.alert('Check your weight', error);
      return;
    }

    savingRef.current = true;
    setSaving(true);
    try {
      await addWeightEntry(weightKg);
      await syncProfileWeight(weightKg);
      await refreshProfile();
      setNewWeight('');
      await loadData();
      Alert.alert('Weight logged', 'Your weight has been recorded.');
    } catch {
      Alert.alert('Couldn’t log weight', 'Something went wrong. Please try again.');
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  const removeEntry = async (entry: WeightEntry) => {
    try {
      const latestBefore = await getLatestWeightEntry();
      await deleteWeightEntry(entry.id);
      // If the newest entry was removed, roll the profile weight back to the
      // newest remaining entry so targets match the history.
      if (latestBefore?.id === entry.id) {
        const newest = await getLatestWeightEntry();
        if (newest) {
          await syncProfileWeight(newest.weightKg, {
            promptForCustomAdjustment: false,
          });
          await refreshProfile();
        }
      }
    } catch {
      Alert.alert('Couldn’t remove entry', 'Something went wrong. Please try again.');
    }
    await loadData();
  };

  const handleDelete = (entry: WeightEntry) => {
    Alert.alert('Remove entry', `Remove weight from ${entry.date}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => {
          removeEntry(entry);
        },
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
                <TouchableOpacity
                  onPress={() => handleDelete(entry)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  accessibilityLabel="Remove entry">
                  <Icon name="trash-outline" size={18} color={colors.chili} />
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
    ...typography.label,
    color: colors.ink,
    marginBottom: spacing.sm,
    marginTop: spacing.sm,
  },
  logBtn: {
    marginBottom: spacing.lg,
  },
  emptyText: {
    ...typography.caption,
    color: colors.stone,
  },
  weightList: {
    backgroundColor: colors.porcelain,
    borderRadius: radii.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.line,
  },
  weightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  weightRowBorder: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.line,
  },
  weightDate: {
    flex: 1,
    ...typography.caption,
    color: colors.stone,
  },
  weightValue: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 15,
    lineHeight: 20,
    color: colors.ink,
    marginRight: spacing.md,
  },
});
