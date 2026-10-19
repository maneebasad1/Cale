/** Max calories for a single entry or saved food (matches the AI estimate clamp). */
export const MAX_ENTRY_CALORIES = 10_000;

/** Keep digits only and cap the length so the field can't hold absurd values. */
export function sanitizeCalorieInput(text: string): string {
  return text.replace(/\D/g, '').replace(/^0+(?=\d)/, '').slice(0, 6);
}

/** Validation message for a single entry/food calorie amount, or null if OK. */
export function getCalorieLimitError(value: number): string | null {
  if (Number.isFinite(value) && value > MAX_ENTRY_CALORIES) {
    return `Keep a single entry at or below ${MAX_ENTRY_CALORIES.toLocaleString()} kcal.`;
  }
  return null;
}

/** Add a quick-add amount without exceeding the per-entry cap. */
export function addCaloriesCapped(current: number, amount: number): number {
  const base = Number.isFinite(current) && current > 0 ? current : 0;
  return Math.min(base + amount, MAX_ENTRY_CALORIES);
}
