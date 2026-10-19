import {
  MAX_ENTRY_CALORIES,
  addCaloriesCapped,
  getCalorieLimitError,
  sanitizeCalorieInput,
} from '../calorieLimits';
import { getDefaultMealType } from '../mealTime';

describe('calorieLimits / mealTime', () => {
  it('strips non-digits and leading zeros', () => {
    expect(sanitizeCalorieInput('1,2a3.4')).toBe('1234');
    expect(sanitizeCalorieInput('-50')).toBe('50');
    expect(sanitizeCalorieInput('007')).toBe('7');
    expect(sanitizeCalorieInput('0')).toBe('0');
    expect(sanitizeCalorieInput('')).toBe('');
    expect(sanitizeCalorieInput('99999999')).toBe('999999');
  });

  it('flags values above the cap', () => {
    expect(getCalorieLimitError(MAX_ENTRY_CALORIES)).toBeNull();
    expect(getCalorieLimitError(500)).toBeNull();
    expect(getCalorieLimitError(MAX_ENTRY_CALORIES + 1)).toMatch(/10,000/);
  });

  it('caps quick-add at the max', () => {
    expect(addCaloriesCapped(0, 250)).toBe(250);
    expect(addCaloriesCapped(NaN, 100)).toBe(100);
    expect(addCaloriesCapped(9_900, 500)).toBe(MAX_ENTRY_CALORIES);
    expect(addCaloriesCapped(MAX_ENTRY_CALORIES, 100)).toBe(MAX_ENTRY_CALORIES);
  });

  it('picks a default meal by local time', () => {
    const at = (h: number) => new Date(2026, 0, 1, h, 30);
    expect(getDefaultMealType(at(7))).toBe('breakfast');
    expect(getDefaultMealType(at(10))).toBe('breakfast');
    expect(getDefaultMealType(at(11))).toBe('lunch');
    expect(getDefaultMealType(at(15))).toBe('lunch');
    expect(getDefaultMealType(at(16))).toBe('dinner');
    expect(getDefaultMealType(at(20))).toBe('dinner');
    expect(getDefaultMealType(at(21))).toBe('snack');
    expect(getDefaultMealType(at(2))).toBe('breakfast');
  });
});
