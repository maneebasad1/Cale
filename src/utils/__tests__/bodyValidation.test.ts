import {
  heightLimitsLabel,
  validateAge,
  validateFeetInches,
  validateGoalWeightKg,
  validateHeightCm,
  validateWeightKg,
  weightLimitsLabel,
} from '../bodyValidation';
import { feetInchesToCm, lbToKg } from '../units';

describe('bodyValidation', () => {
  it('validates age between 13 and 100', () => {
    expect(validateAge(13)).toBeNull();
    expect(validateAge(100)).toBeNull();
    expect(validateAge(12)).toMatch(/between 13 and 100/);
    expect(validateAge(101)).toMatch(/between 13 and 100/);
    expect(validateAge(NaN)).toBe('Enter a valid age.');
    expect(validateAge(30.5)).toBe('Enter a valid age.');
  });

  it('validates height between 100 and 250 cm', () => {
    expect(validateHeightCm(100)).toBeNull();
    expect(validateHeightCm(250)).toBeNull();
    expect(validateHeightCm(99)).toMatch(/100–250 cm/);
    expect(validateHeightCm(251)).toMatch(/100–250 cm/);
    expect(validateHeightCm(0)).toBe('Enter a valid height.');
  });

  it('reports height limits in ft/in for imperial users', () => {
    expect(heightLimitsLabel('ft_in')).toBe('3\'4"–8\'2"');
    expect(validateHeightCm(feetInchesToCm(3, 4), 'ft_in')).toBeNull();
    expect(validateHeightCm(feetInchesToCm(8, 2), 'ft_in')).toBeNull();
    expect(validateHeightCm(feetInchesToCm(9, 0), 'ft_in')).toMatch(
      /3'4"–8'2"/,
    );
  });

  it('rejects 12+ inches in the inches field', () => {
    expect(validateFeetInches(5, 11)).toBeNull();
    expect(validateFeetInches(5, 12)).toMatch(/Inches/);
  });

  it('validates weight between 30 and 300 kg', () => {
    expect(validateWeightKg(30)).toBeNull();
    expect(validateWeightKg(300)).toBeNull();
    expect(validateWeightKg(29.9)).toMatch(/30–300 kg/);
    expect(validateWeightKg(300.1)).toMatch(/30–300 kg/);
    expect(validateWeightKg(NaN)).toBe('Enter a valid weight.');
    expect(validateWeightKg(-5)).toBe('Enter a valid weight.');
  });

  it('reports weight limits in lb for lb users', () => {
    expect(weightLimitsLabel('lb')).toBe('67–661 lb');
    expect(validateWeightKg(lbToKg(150), 'lb')).toBeNull();
    expect(validateWeightKg(lbToKg(50), 'lb')).toMatch(/67–661 lb/);
    expect(validateWeightKg(lbToKg(700), 'lb')).toMatch(/67–661 lb/);
  });

  it('validates goal weight in the same range', () => {
    expect(validateGoalWeightKg(70)).toBeNull();
    expect(validateGoalWeightKg(20)).toMatch(/Goal weight must be between/);
    expect(validateGoalWeightKg(0)).toBe('Enter a valid goal weight.');
  });
});
