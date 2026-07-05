import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Icon } from '../../components/Icon';
import { OnboardingFooter } from '../../components/onboarding/OnboardingFooter';
import { OnboardingHeader } from '../../components/onboarding/OnboardingHeader';
import { Screen } from '../../components/Screen';
import { colors, spacing } from '../../constants/theme';
import type { OnboardingStackParamList } from '../../navigation/types';
import { useApp } from '../../context/AppContext';
import { saveProfile } from '../../services/storage';
import {
  formatTargetRange,
  TARGET_RANGE_KCAL,
} from '../../utils/calorieStats';
import { estimateWeeklyWeightChange } from '../../utils/bmr';
import { displayWeight } from '../../utils/units';

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
    weightUnit,
    heightUnit,
  } = route.params;
  const [loading, setLoading] = useState(false);
  const { refreshProfile } = useApp();

  const isMaintain = goalType === 'maintain';
  const isLoss = goalType === 'lose';
  const weeklyChange = estimateWeeklyWeightChange(calorieAdjustment);

  const reasoningLine = isMaintain
    ? `${maintenanceCalories.toLocaleString()} kcal/day matches your estimated maintenance`
    : `${dailyTargetCalories.toLocaleString()} kcal/day → ~${weeklyChange} kg/week ${isLoss ? 'loss' : 'gain'}`;

  const handleGetStarted = async () => {
    setLoading(true);
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
        weightUnit,
        heightUnit,
        onboardingComplete: true,
      });
      await refreshProfile();
    } finally {
      setLoading(false);
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
          title="Your plan is ready!"
          subtitle={
            isMaintain
              ? 'Your daily target is set to your maintenance calories.'
              : "Here's a breakdown of your daily calorie targets."
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
              Estimated pace: ~{weeklyChange} kg per week
            </Text>
          </View>
        )}

        <Text style={styles.note}>
          Targets use the Mifflin-St Jeor equation and are estimates (±
          {TARGET_RANGE_KCAL} kcal). You can update your profile anytime in
          Settings.
        </Text>
      </ScrollView>

      <OnboardingFooter
        title="Get Started"
        onPress={handleGetStarted}
        loading={loading}
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
    borderRadius: 20,
    padding: spacing.xl,
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  heroLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.85)',
    fontWeight: '500',
    marginBottom: spacing.xs,
  },
  heroValue: {
    fontSize: 52,
    fontWeight: '700',
    color: colors.surface,
  },
  heroUnit: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.85)',
    marginTop: spacing.xs,
  },
  heroRange: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.75)',
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  reasoning: {
    fontSize: 15,
    color: colors.text,
    lineHeight: 22,
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
    borderRadius: 14,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.xs,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  statValue: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
  },
  goalCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
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
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  goalText: {
    fontSize: 15,
    color: colors.textSecondary,
    lineHeight: 22,
    marginBottom: spacing.sm,
  },
  goalBold: {
    fontWeight: '700',
    color: colors.text,
  },
  goalEstimate: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: '500',
  },
  note: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
});
