import type { HeightUnit, WeightUnit } from '../types';
import { kgToLb } from './units';

export const MIN_AGE = 13;
export const MAX_AGE = 100;
export const MIN_HEIGHT_CM = 100;
export const MAX_HEIGHT_CM = 250;
export const MIN_WEIGHT_KG = 30;
export const MAX_WEIGHT_KG = 300;

const CM_PER_INCH = 2.54;
/** Absorbs float noise from unit conversions at the exact boundaries. */
const EPSILON = 1e-6;

function formatFeetInches(totalInches: number): string {
  return `${Math.floor(totalInches / 12)}'${totalInches % 12}"`;
}

/** Weight limits expressed in the user's unit (rounded inward). */
export function weightLimitsLabel(unit: WeightUnit): string {
  if (unit === 'lb') {
    return `${Math.ceil(kgToLb(MIN_WEIGHT_KG))}–${Math.floor(kgToLb(MAX_WEIGHT_KG))} lb`;
  }
  return `${MIN_WEIGHT_KG}–${MAX_WEIGHT_KG} kg`;
}

/** Height limits expressed in the user's unit (rounded inward). */
export function heightLimitsLabel(unit: HeightUnit): string {
  if (unit === 'ft_in') {
    const minInches = Math.ceil(MIN_HEIGHT_CM / CM_PER_INCH);
    const maxInches = Math.floor(MAX_HEIGHT_CM / CM_PER_INCH);
    return `${formatFeetInches(minInches)}–${formatFeetInches(maxInches)}`;
  }
  return `${MIN_HEIGHT_CM}–${MAX_HEIGHT_CM} cm`;
}

function isWithin(value: number, min: number, max: number): boolean {
  return value >= min - EPSILON && value <= max + EPSILON;
}

export function validateAge(age: number): string | null {
  if (!Number.isFinite(age) || age <= 0 || !Number.isInteger(age)) {
    return 'Enter a valid age.';
  }
  if (!isWithin(age, MIN_AGE, MAX_AGE)) {
    return `Age must be between ${MIN_AGE} and ${MAX_AGE}.`;
  }
  return null;
}

export function validateHeightCm(
  heightCm: number,
  unit: HeightUnit = 'cm',
): string | null {
  if (!Number.isFinite(heightCm) || heightCm <= 0) {
    return 'Enter a valid height.';
  }
  if (!isWithin(heightCm, MIN_HEIGHT_CM, MAX_HEIGHT_CM)) {
    return `Height must be between ${heightLimitsLabel(unit)}.`;
  }
  return null;
}

/** Validates the ft/in fields themselves before range-checking the total. */
export function validateFeetInches(feet: number, inches: number): string | null {
  if (
    !Number.isFinite(feet) ||
    !Number.isFinite(inches) ||
    feet < 0 ||
    inches < 0
  ) {
    return 'Enter a valid height.';
  }
  if (inches >= 12) {
    return 'Inches must be between 0 and 11.';
  }
  return null;
}

export function validateWeightKg(
  weightKg: number,
  unit: WeightUnit = 'kg',
): string | null {
  if (!Number.isFinite(weightKg) || weightKg <= 0) {
    return 'Enter a valid weight.';
  }
  if (!isWithin(weightKg, MIN_WEIGHT_KG, MAX_WEIGHT_KG)) {
    return `Weight must be between ${weightLimitsLabel(unit)}.`;
  }
  return null;
}

export function validateGoalWeightKg(
  goalWeightKg: number,
  unit: WeightUnit = 'kg',
): string | null {
  if (!Number.isFinite(goalWeightKg) || goalWeightKg <= 0) {
    return 'Enter a valid goal weight.';
  }
  if (!isWithin(goalWeightKg, MIN_WEIGHT_KG, MAX_WEIGHT_KG)) {
    return `Goal weight must be between ${weightLimitsLabel(unit)}.`;
  }
  return null;
}
