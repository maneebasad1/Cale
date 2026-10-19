import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { BrandLogo } from '../../components/BrandLogo';
import { KeyboardAwareScreen } from '../../components/KeyboardAwareScreen';
import { LabeledInput } from '../../components/LabeledInput';
import { FormSection } from '../../components/onboarding/FormSection';
import { OnboardingFooter } from '../../components/onboarding/OnboardingFooter';
import { OnboardingHeader } from '../../components/onboarding/OnboardingHeader';
import { Screen } from '../../components/Screen';
import { UnitToggle } from '../../components/UnitToggle';
import { colors, spacing, typography } from '../../constants/theme';
import type { OnboardingStackParamList } from '../../navigation/types';
import type { HeightUnit, WeightUnit } from '../../types';
import {
  cmToFeetInches,
  feetInchesToCm,
  kgToLb,
  lbToKg,
} from '../../utils/units';
import {
  validateFeetInches,
  validateHeightCm,
  validateWeightKg,
} from '../../utils/bodyValidation';
import { parseDecimal } from '../../utils/parseDecimal';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'BodyMetrics'>;

export function BodyMetricsScreen({ navigation }: Props) {
  const [weightUnit, setWeightUnit] = useState<WeightUnit>('kg');
  const [heightUnit, setHeightUnit] = useState<HeightUnit>('cm');
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [heightFeet, setHeightFeet] = useState('');
  const [heightInches, setHeightInches] = useState('');

  const weightNum = parseDecimal(weight);
  const weightKg = weightUnit === 'kg' ? weightNum : lbToKg(weightNum);
  const weightError = weight.trim()
    ? validateWeightKg(weightKg, weightUnit)
    : null;

  const resolveHeightCm = (): number => {
    if (heightUnit === 'cm') {
      return parseDecimal(height);
    }
    return feetInchesToCm(
      parseInt(heightFeet, 10) || 0,
      parseInt(heightInches, 10) || 0,
    );
  };
  const heightCm = resolveHeightCm();
  const hasHeightInput =
    heightUnit === 'cm'
      ? Boolean(height.trim())
      : Boolean(heightFeet.trim() || heightInches.trim());
  const heightError = !hasHeightInput
    ? null
    : heightUnit === 'ft_in'
      ? validateFeetInches(
          parseInt(heightFeet, 10) || 0,
          parseInt(heightInches, 10) || 0,
        ) ?? validateHeightCm(heightCm, heightUnit)
      : validateHeightCm(heightCm, heightUnit);

  const isValid = () =>
    Boolean(weight.trim()) &&
    hasHeightInput &&
    !weightError &&
    !heightError;

  const convertWeight = (unit: WeightUnit) => {
    if (weight) {
      const num = parseDecimal(weight);
      if (!isNaN(num)) {
        setWeight(
          String(
            Math.round((unit === 'kg' ? lbToKg(num) : kgToLb(num)) * 10) / 10,
          ),
        );
      }
    }
    setWeightUnit(unit);
  };

  const convertHeight = (unit: HeightUnit) => {
    if (unit === 'ft_in' && height) {
      const cm = parseDecimal(height);
      if (!isNaN(cm)) {
        const { feet, inches } = cmToFeetInches(cm);
        setHeightFeet(String(feet));
        setHeightInches(String(inches));
      }
    } else if (unit === 'cm' && (heightFeet || heightInches)) {
      const cm = feetInchesToCm(
        parseInt(heightFeet, 10) || 0,
        parseInt(heightInches, 10) || 0,
      );
      setHeight(String(Math.round(cm)));
    }
    setHeightUnit(unit);
  };

  const handleContinue = () => {
    if (!isValid()) {
      return;
    }

    navigation.navigate('PersonalInfo', {
      weightKg,
      heightCm,
      weightUnit,
      heightUnit,
    });
  };

  return (
    <Screen>
      <KeyboardAwareScreen
        contentContainerStyle={styles.scrollContent}
        footer={
          <OnboardingFooter
            title="Continue"
            onPress={handleContinue}
            disabled={!isValid()}
          />
        }>
        <BrandLogo size="lg" layout="row" showTagline style={styles.brand} />
        <OnboardingHeader
          step={1}
          title="Your body stats"
          subtitle="Weight and height help us estimate your daily calorie needs."
        />

        <FormSection title="Current weight">
          <UnitToggle
            options={[
              { value: 'kg' as WeightUnit, label: 'kg' },
              { value: 'lb' as WeightUnit, label: 'lb' },
            ]}
            value={weightUnit}
            onChange={convertWeight}
            style={styles.toggle}
          />
          <LabeledInput
            label=""
            value={weight}
            onChangeText={setWeight}
            placeholder={weightUnit === 'kg' ? '70' : '154'}
            keyboardType="numeric"
            suffix={weightUnit}
            error={weightError}
          />
        </FormSection>

        <FormSection title="Height">
          <UnitToggle
            options={[
              { value: 'cm' as HeightUnit, label: 'cm' },
              { value: 'ft_in' as HeightUnit, label: 'ft/in' },
            ]}
            value={heightUnit}
            onChange={convertHeight}
            style={styles.toggle}
          />
          {heightUnit === 'cm' ? (
            <LabeledInput
              label=""
              value={height}
              onChangeText={setHeight}
              placeholder="175"
              keyboardType="numeric"
              suffix="cm"
              error={heightError}
            />
          ) : (
            <View style={styles.heightRow}>
              <View style={styles.heightField}>
                <LabeledInput
                  label=""
                  value={heightFeet}
                  onChangeText={setHeightFeet}
                  placeholder="5"
                  keyboardType="number-pad"
                  suffix="ft"
                />
              </View>
              <View style={styles.heightField}>
                <LabeledInput
                  label=""
                  value={heightInches}
                  onChangeText={setHeightInches}
                  placeholder="9"
                  keyboardType="number-pad"
                  suffix="in"
                />
              </View>
            </View>
          )}
          {heightUnit === 'ft_in' && heightError ? (
            <Text style={styles.error}>{heightError}</Text>
          ) : null}
        </FormSection>
      </KeyboardAwareScreen>
    </Screen>
  );
}

const styles = StyleSheet.create({
  brand: {
    marginBottom: spacing.md,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.md,
  },
  toggle: {
    marginBottom: spacing.sm,
  },
  heightRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  heightField: {
    flex: 1,
  },
  error: {
    ...typography.caption,
    color: colors.error,
    marginTop: -spacing.sm,
  },
});
