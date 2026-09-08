import React, { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { OnboardingCaloriePreview } from '../../components/onboarding/OnboardingCaloriePreview';
import { OnboardingFooter } from '../../components/onboarding/OnboardingFooter';
import { OnboardingHeader } from '../../components/onboarding/OnboardingHeader';
import { SelectionCard } from '../../components/onboarding/SelectionCard';
import { Screen } from '../../components/Screen';
import { spacing } from '../../constants/theme';
import type { OnboardingStackParamList } from '../../navigation/types';
import type { ActivityLevel } from '../../types';
import { ACTIVITY_LEVELS } from '../../types';
import { calculateMaintenance } from '../../utils/bmr';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'Activity'>;

export function ActivityScreen({ route, navigation }: Props) {
  const { weightKg, heightCm, age, gender, weightUnit, heightUnit } =
    route.params;
  const [activityLevel, setActivityLevel] = useState<ActivityLevel | null>(
    null,
  );

  const handleContinue = () => {
    if (!activityLevel) {
      return;
    }

    const maintenanceCalories = calculateMaintenance(
      weightKg,
      heightCm,
      age,
      gender,
      activityLevel,
    );

    navigation.navigate('Goal', {
      weightKg,
      heightCm,
      age,
      gender,
      activityLevel,
      maintenanceCalories,
      weightUnit,
      heightUnit,
    });
  };

  return (
    <Screen edges={['bottom']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <OnboardingHeader
          step={3}
          title="How active are you?"
          subtitle="Pick the option that best matches a typical week for you."
        />

        {activityLevel ? (
          <OnboardingCaloriePreview
            calories={calculateMaintenance(
              weightKg,
              heightCm,
              age,
              gender,
              activityLevel,
            )}
            caption="With this activity level"
            hint="Next we'll set a target for your weight goal."
          />
        ) : null}

        <View style={styles.options}>
          {ACTIVITY_LEVELS.map(level => (
            <SelectionCard
              key={level.value}
              label={level.label}
              description={level.description}
              selected={activityLevel === level.value}
              onPress={() => setActivityLevel(level.value)}
              icon="fitness-outline"
            />
          ))}
        </View>
      </ScrollView>

      <OnboardingFooter
        title="Continue"
        onPress={handleContinue}
        disabled={!activityLevel}
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
  options: {
    gap: spacing.sm,
  },
});
