import React, { useRef, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Icon } from '../../components/Icon';
import { OnboardingFooter } from '../../components/onboarding/OnboardingFooter';
import { OnboardingHeader } from '../../components/onboarding/OnboardingHeader';
import { Screen } from '../../components/Screen';
import { colors, fonts, radii, spacing, typography } from '../../constants/theme';
import type { OnboardingStackParamList } from '../../navigation/types';
import { useApp } from '../../context/AppContext';
import { saveProfile } from '../../services/storage';
import {
  formatTargetRange,
  TARGET_RANGE_KCAL,
} from '../../utils/calorieStats';
import { displayWeight } from '../../utils/units';
import { estimateWeeklyWeightChangeForUnit } from '../../utils/weightTimeline';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'Summary'>;

export function SummaryScreen({ route }: Props) {
  const {
    weightKg,
    heightCm,
    age,
    gender,
    activityLevel,
    maintenanceCalories,
    goalType,
    goalWeightKg,
    calorieAdjustment,
    dailyTargetCalories,
    adjustmentIsCustom,
    weightUnit,
    heightUnit,
  } = route.params;
  const { refreshProfile } = useApp();
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);

  const isMaintain = goalType === 'maintain';
  const isLoss = goalType === 'lose';
  const weeklyChange = estimateWeeklyWeightChangeForUnit(
    Math.abs(calorieAdjustment),
    weightUnit,
  );

  const reasoningLine = isMaintain
    ? dailyTargetCalories > maintenanceCalories
      ? `${dailyTargetCalories.toLocaleString()} kcal/day is the safe minimum (your estimated maintenance is ${maintenanceCalories.toLocaleString()})`
      : `${maintenanceCalories.toLocaleString()} kcal/day matches your estimated maintenance`
    : `${dailyTargetCalories.toLocaleString()} kcal/day → ~${weeklyChange} ${weightUnit}/week ${isLoss ? 'loss' : 'gain'}`;

  const handleGetStarted = async () => {
    // Ref guard blocks a second tap that lands before the re-render.
    if (savingRef.current) {
      return;
    }
    savingRef.current = true;
    setSaving(true);
    try {
      await saveProfile({
        weightKg,
        heightCm,
        age,
        gender,
        activityLevel,
        maintenanceCalories,
        goalType,
        goalWeightKg,
        calorieAdjustment,
        dailyTargetCalories,
        adjustmentIsCustom,
        weightUnit,
        heightUnit,
        onboardingComplete: true,
      });
      await refreshProfile();
    } catch {
      Alert.alert(
        'Couldn’t save your plan',
        'Something went wrong saving your profile. Please try again.',
      );
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  return (
    <Screen>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        <OnboardingHeader
          step={5}
          title="Your plan is ready"
          subtitle={
            isMaintain
              ? 'Your daily target matches your maintenance calories.'
              : 'Here’s your daily calorie target and how we got there.'
          }
        />

        <View style={styles.heroCard}>
          <Text style={styles.heroLabel}>
            {isMaintain ? 'Daily maintenance' : 'Eat each day'}
          </Text>
          <Text style={styles.heroValue}>
            {dailyTargetCalories.toLocaleString()}
          </Text>
          <Text style={styles.heroUnit}>kcal / day</Text>
          <Text style={styles.heroRange}>
            Typical range: {formatTargetRange(dailyTargetCalories)}
          </Text>
        </View>

        <Text style={styles.reasoning}>{reasoningLine}</Text>

        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Icon name="flame" size={22} color={colors.textSecondary} />
            <Text style={styles.statLabel}>Maintenance</Text>
            <Text style={styles.statValue}>
              {maintenanceCalories.toLocaleString()}
            </Text>
          </View>
          {!isMaintain && (
            <View style={styles.statCard}>
              <Icon
                name={isLoss ? 'arrow-down' : 'arrow-up'}
                size={22}
                color={isLoss ? colors.warning : colors.primary}
              />
              <Text style={styles.statLabel}>
                Daily {isLoss ? 'deficit' : 'surplus'}
              </Text>
              <Text
                style={[
                  styles.statValue,
                  { color: isLoss ? colors.warning : colors.primary },
                ]}>
                {Math.abs(calorieAdjustment).toLocaleString()}
              </Text>
            </View>
          )}
        </View>

        {!isMaintain && (
          <View style={styles.goalCard}>
            <View style={styles.goalRow}>
              <Icon name="flag" size={20} color={colors.primary} />
              <Text style={styles.goalTitle}>Your goal</Text>
            </View>
            <Text style={styles.goalText}>
              {isLoss ? 'Lose' : 'Gain'} weight from{' '}
              <Text style={styles.goalBold}>
                {displayWeight(weightKg, weightUnit)}
              </Text>{' '}
              to{' '}
              <Text style={styles.goalBold}>
                {displayWeight(goalWeightKg, weightUnit)}
              </Text>
            </Text>
            <Text style={styles.goalEstimate}>
              Estimated pace: ~{weeklyChange} {weightUnit} per week
            </Text>
          </View>
        )}

        <Text style={styles.note}>
          Targets use the Mifflin-St Jeor equation and are estimates (±
          {TARGET_RANGE_KCAL} kcal). You can update your profile anytime in
          Profile.
        </Text>
      </ScrollView>

      <OnboardingFooter
        title="Get started"
        onPress={handleGetStarted}
        loading={saving}
        disabled={saving}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.md,
  },
  heroCard: {
    backgroundColor: colors.primary,
    borderRadius: radii.xl,
    padding: spacing.xl,
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  heroLabel: {
    ...typography.label,
    color: 'rgba(255,255,255,0.85)',
    marginBottom: spacing.xs,
  },
  heroValue: {
    fontFamily: fonts.displayBold,
    fontSize: 52,
    color: colors.surface,
  },
  heroUnit: {
    ...typography.body,
    color: 'rgba(255,255,255,0.85)',
    marginTop: spacing.xs,
  },
  heroRange: {
    ...typography.caption,
    color: 'rgba(255,255,255,0.75)',
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  reasoning: {
    ...typography.body,
    color: colors.text,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radii.lg - 2,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.xs,
  },
  statLabel: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  statValue: {
    fontFamily: fonts.displayBold,
    fontSize: 22,
    color: colors.text,
  },
  goalCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg - 2,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  goalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  goalTitle: {
    ...typography.label,
    color: colors.text,
  },
  goalText: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  goalBold: {
    fontFamily: fonts.bodyBold,
    color: colors.text,
  },
  goalEstimate: {
    ...typography.caption,
    color: colors.primary,
  },
  note: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
