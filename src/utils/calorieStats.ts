import type { DailyLog, GoalType } from '../types';
import { addDays, formatDateKey } from './date';

function sumLogCalories(log: DailyLog | undefined): number {
  return log?.entries.reduce((sum, entry) => sum + entry.calories, 0) ?? 0;
}

/** A day counts as logged when it has at least one entry. */
export function isLoggedDay(log: DailyLog | undefined): boolean {
  return (log?.entries.length ?? 0) > 0;
}

export const TARGET_RANGE_KCAL = 75;

export function getTrailingDates(
  endDate: string,
  count: number,
): string[] {
  const dates: string[] = [];
  for (let i = count - 1; i >= 0; i -= 1) {
    dates.push(addDays(endDate, -i));
  }
  return dates;
}

/**
 * Average calories over the trailing window, counting only days that have
 * entries (unlogged days are unknown, not zero). Returns 0 when nothing is
 * logged in the window.
 */
export function getTrailingAverageCalories(
  logs: Record<string, DailyLog>,
  endDate: string = formatDateKey(),
  days = 7,
): number {
  const loggedDates = getTrailingDates(endDate, days).filter(date =>
    isLoggedDay(logs[date]),
  );
  if (!loggedDates.length) {
    return 0;
  }
  const total = loggedDates.reduce(
    (sum, date) => sum + sumLogCalories(logs[date]),
    0,
  );
  return Math.round(total / loggedDates.length);
}

export interface DayStat {
  date: string;
  total: number;
  target: number;
  deltaFromTarget: number;
  /** False when the day has no entries (total is then 0 but unknown). */
  logged: boolean;
}

export interface PeriodSummary {
  averageDailyCalories: number;
  bestDay: DayStat | null;
  worstDay: DayStat | null;
  days: DayStat[];
  totalWorkoutCalories: number;
  topWorkoutName: string | null;
}

function rankDay(
  goalType: GoalType,
  deltaFromTarget: number,
): number {
  if (goalType === 'lose') {
    return -deltaFromTarget;
  }
  if (goalType === 'gain') {
    return deltaFromTarget;
  }
  return -Math.abs(deltaFromTarget);
}

export function getPeriodSummary(
  logs: Record<string, DailyLog>,
  startDate: string,
  endDate: string,
  getTargetForDate: (date: string) => number,
  goalType: GoalType,
  workoutCaloriesByDate: Record<string, number> = {},
  today: string = formatDateKey(),
): PeriodSummary {
  const days: DayStat[] = [];
  let cursor = startDate;

  while (cursor <= endDate) {
    const total = sumLogCalories(logs[cursor]);
    const target = getTargetForDate(cursor);
    days.push({
      date: cursor,
      total,
      target,
      deltaFromTarget: total - target,
      logged: isLoggedDay(logs[cursor]),
    });
    cursor = addDays(cursor, 1);
  }

  const loggedDays = days.filter(day => day.logged);
  const averageDailyCalories = loggedDays.length
    ? Math.round(
        loggedDays.reduce((sum, day) => sum + day.total, 0) / loggedDays.length,
      )
    : 0;

  // Rank completed logged days only — unlogged days aren't "0 kcal" and
  // today is still in progress.
  const ranked = loggedDays
    .filter(day => day.date !== today)
    .sort(
      (a, b) =>
        rankDay(goalType, b.deltaFromTarget) -
        rankDay(goalType, a.deltaFromTarget),
    );

  const totalWorkoutCalories = Object.entries(workoutCaloriesByDate)
    .filter(([date]) => date >= startDate && date <= endDate)
    .reduce((sum, [, burned]) => sum + burned, 0);

  return {
    averageDailyCalories,
    bestDay: ranked[0] ?? null,
    // With a single ranked day, best and worst would be the same day.
    worstDay: ranked.length > 1 ? ranked[ranked.length - 1] : null,
    days,
    totalWorkoutCalories,
    topWorkoutName: null,
  };
}

export function formatTargetRange(target: number): string {
  const low = Math.max(0, target - TARGET_RANGE_KCAL);
  const high = target + TARGET_RANGE_KCAL;
  return `${low.toLocaleString()}–${high.toLocaleString()} kcal`;
}
