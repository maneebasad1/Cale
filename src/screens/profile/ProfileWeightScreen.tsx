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
import { Icon } from '../../components/Icon';
import { KeyboardAwareScreen } from '../../components/KeyboardAwareScreen';
import { LabeledInput } from '../../components/LabeledInput';
import { Screen } from '../../components/Screen';
import { colors, fonts, radii, spacing, typography } from '../../constants/theme';
import { getProfile, saveProfile } from '../../services/storage';
import {
  addWeightEntry,
  deleteWeightEntry,
  getWeightEntries,
} from '../../services/weightService';
import type { WeightEntry } from '../../types/weight';
import { displayWeight, lbToKg } from '../../utils/units';
import { buildUpdatedProfile } from '../../utils/profileSave';
import {
  promptCustomAdjustmentUpdate,
  shouldPromptCustomAdjustmentUpdate,
} from '../../utils/profileAdjustmentPrompt';

export function ProfileWeightScreen() {
  const [weightUnit, setWeightUnit] = useState<'kg' | 'lb'>('kg');
  const [weightEntries, setWeightEntries] = useState<WeightEntry[]>([]);
  const [newWeight, setNewWeight] = useState('');

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
      Alert.alert('Check your weight', 'Enter a valid weight to log.');
      return;
    }

    const weightKg = weightUnit === 'kg' ? weightNum : lbToKg(weightNum);

    await addWeightEntry(weightKg);
    const profile = await getProfile();
    if (profile) {
      const applySave = async (useAutoAdjustment: boolean) => {
        const updated = buildUpdatedProfile(profile, {
          weightKg,
          ...(useAutoAdjustment ? { adjustmentIsCustom: false } : {}),
        });
        await saveProfile(updated);
      };

      if (shouldPromptCustomAdjustmentUpdate(profile, { weightKg })) {
        promptCustomAdjustmentUpdate(profile, { weightKg }, useAuto =>
          applySave(useAuto),
        );
      } else {
        await applySave(false);
      }
    }
    setNewWeight('');
    await loadData();
    Alert.alert('Weight logged', 'Your weight has been recorded.');
  };

  const handleDelete = (entry: WeightEntry) => {
    Alert.alert('Remove entry', `Remove weight from ${entry.date}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
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
