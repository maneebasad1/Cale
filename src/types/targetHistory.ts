export interface TargetSnapshot {
  /** YYYY-MM-DD — first day this target applies (inclusive). */
  effectiveFrom: string;
  dailyTargetCalories: number;
  maintenanceCalories: number;
}
