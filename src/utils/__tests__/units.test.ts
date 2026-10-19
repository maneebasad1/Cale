import {
  cmToFeetInches,
  displayHeight,
  feetInchesToCm,
  formatWeightInput,
  toDisplayWeightValue,
} from '../units';
import { parseDecimal } from '../parseDecimal';

describe('cmToFeetInches', () => {
  it('carries 12 inches into the next foot', () => {
    expect(cmToFeetInches(182)).toEqual({ feet: 6, inches: 0 });
    expect(displayHeight(182, 'ft_in')).toBe('6\'0"');
  });

  it('handles exact and near-exact feet', () => {
    expect(cmToFeetInches(152)).toEqual({ feet: 5, inches: 0 });
    expect(cmToFeetInches(feetInchesToCm(5, 11))).toEqual({
      feet: 5,
      inches: 11,
    });
  });

  it('never returns 12 inches', () => {
    for (let cm = 100; cm <= 250; cm += 0.5) {
      expect(cmToFeetInches(cm).inches).toBeLessThan(12);
    }
  });
});

describe('weight display helpers', () => {
  it('rounds to one decimal in the requested unit', () => {
    expect(toDisplayWeightValue(70.34, 'kg')).toBe(70.3);
    expect(toDisplayWeightValue(70, 'lb')).toBe(154.3);
    expect(formatWeightInput(80, 'kg')).toBe('80');
  });
});

describe('parseDecimal', () => {
  it('accepts dot or comma decimal separators', () => {
    expect(parseDecimal('70.5')).toBe(70.5);
    expect(parseDecimal('70,5')).toBe(70.5);
    expect(parseDecimal(' 80 ')).toBe(80);
    expect(parseDecimal('.5')).toBe(0.5);
    expect(parseDecimal('70.')).toBe(70);
  });

  it('returns NaN for garbage', () => {
    expect(parseDecimal('')).toBeNaN();
    expect(parseDecimal('   ')).toBeNaN();
    expect(parseDecimal('abc')).toBeNaN();
    expect(parseDecimal('70kg')).toBeNaN();
    expect(parseDecimal('1,234.5')).toBeNaN();
    expect(parseDecimal('7,0,5')).toBeNaN();
  });
});
