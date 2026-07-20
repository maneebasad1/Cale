/** MET × weightKg × (durationMinutes / 60) */
export function calculateWorkoutCalories(
  met: number,
  weightKg: number,
  durationMinutes: number,
): number {
  if (!met || !weightKg || !durationMinutes) {
    return 0;
  }
  return Math.round(met * weightKg * (durationMinutes / 60));
}

export function getTotalWorkoutCalories(
  entries: { caloriesBurned: number }[],
): number {
  return entries.reduce((sum, entry) => sum + entry.caloriesBurned, 0);
}

/** remaining = target - consumed (workouts are tracked separately). */
export function calculateRemainingCalories(
  target: number,
  consumed: number,
): number {
  return target - consumed;
}
