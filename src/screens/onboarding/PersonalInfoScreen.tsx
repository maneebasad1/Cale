import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { KeyboardAwareScreen } from '../../components/KeyboardAwareScreen';
import { LabeledInput } from '../../components/LabeledInput';
import { FormSection } from '../../components/onboarding/FormSection';
import { OnboardingFooter } from '../../components/onboarding/OnboardingFooter';
import { OnboardingHeader } from '../../components/onboarding/OnboardingHeader';
import { Screen } from '../../components/Screen';
import { colors, radii, spacing, typography } from '../../constants/theme';
import type { OnboardingStackParamList } from '../../navigation/types';
import type { Gender } from '../../types';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'PersonalInfo'>;

export function PersonalInfoScreen({ route, navigation }: Props) {
  const { weightKg, heightCm, weightUnit, heightUnit } = route.params;
  const [age, setAge] = useState('');
  const [gender, setGender] = useState<Gender | null>(null);

  const isValid = () => {
    const ageNum = parseInt(age, 10);
    return ageNum > 0 && gender !== null;
  };

  const handleContinue = () => {
    const ageNum = parseInt(age, 10);
    if (!ageNum || !gender) {
      return;
    }

    navigation.navigate('Activity', {
      weightKg,
      heightCm,
      age: ageNum,
      gender,
      weightUnit,
      heightUnit,
    });
  };

  return (
    <Screen edges={['bottom']}>
      <KeyboardAwareScreen
        contentContainerStyle={styles.scrollContent}
        footer={
          <OnboardingFooter
            title="Continue"
            onPress={handleContinue}
            disabled={!isValid()}
          />
        }>
        <OnboardingHeader
          step={2}
          title="A bit about you"
          subtitle="Age and gender help us estimate your baseline metabolism."
        />

        <FormSection title="Age">
          <LabeledInput
            label=""
            value={age}
            onChangeText={setAge}
            placeholder="30"
            keyboardType="number-pad"
            suffix="years"
          />
        </FormSection>

        <FormSection title="Gender">
          <View style={styles.genderRow}>
            {(['male', 'female'] as Gender[]).map(g => (
              <TouchableOpacity
                key={g}
                style={[
                  styles.genderBtn,
                  gender === g && styles.genderSelected,
                ]}
                onPress={() => setGender(g)}>
                <Text
                  style={[
                    styles.genderText,
                    gender === g && styles.genderTextSelected,
                  ]}>
                  {g === 'male' ? 'Male' : 'Female'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </FormSection>
      </KeyboardAwareScreen>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.md,
  },
  genderRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  genderBtn: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radii.sm + 2,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.background,
    alignItems: 'center',
  },
  genderSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.noriMute,
  },
  genderText: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
  },
  genderTextSelected: {
    ...typography.label,
    fontSize: 16,
    color: colors.primary,
  },
});
