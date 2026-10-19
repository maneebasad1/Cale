import type { HeightUnit, WeightUnit } from '../types';

const LB_PER_KG = 2.20462;
const CM_PER_INCH = 2.54;

export function kgToLb(kg: number): number {
  return kg * LB_PER_KG;
}

export function lbToKg(lb: number): number {
  return lb / LB_PER_KG;
}

export function cmToFeetInches(cm: number): { feet: number; inches: number } {
  // Round the total first so 71.7in becomes 6'0" rather than 5'12".
  const totalInches = Math.round(cm / CM_PER_INCH);
  const feet = Math.floor(totalInches / 12);
  const inches = totalInches % 12;
  return { feet, inches };
}

export function feetInchesToCm(feet: number, inches: number): number {
  return (feet * 12 + inches) * CM_PER_INCH;
}

/** Weight in the user's unit, rounded to one decimal (what inputs show). */
export function toDisplayWeightValue(kg: number, unit: WeightUnit): number {
  return Math.round((unit === 'lb' ? kgToLb(kg) : kg) * 10) / 10;
}

export function formatWeightInput(kg: number, unit: WeightUnit): string {
  return String(toDisplayWeightValue(kg, unit));
}

export function displayWeight(kg: number, unit: WeightUnit): string {
  if (unit === 'lb') {
    return `${Math.round(kgToLb(kg) * 10) / 10} lb`;
  }
  return `${Math.round(kg * 10) / 10} kg`;
}

export function displayHeight(cm: number, unit: HeightUnit): string {
  if (unit === 'ft_in') {
    const { feet, inches } = cmToFeetInches(cm);
    return `${feet}'${inches}"`;
  }
  return `${Math.round(cm)} cm`;
}
