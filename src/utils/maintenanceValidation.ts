export const MIN_MAINTENANCE_CALORIES = 800;
export const MAX_MAINTENANCE_CALORIES = 6000;

export function validateMaintenanceCalories(value: number): string | null {
  if (!Number.isFinite(value) || value <= 0) {
    return 'Enter a valid maintenance calorie amount.';
  }
  if (value < MIN_MAINTENANCE_CALORIES) {
    return `Maintenance must be at least ${MIN_MAINTENANCE_CALORIES.toLocaleString()} kcal/day.`;
  }
  if (value > MAX_MAINTENANCE_CALORIES) {
    return `Maintenance must be at most ${MAX_MAINTENANCE_CALORIES.toLocaleString()} kcal/day.`;
  }
  return null;
}
