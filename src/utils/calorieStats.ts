import type { DailyLog, GoalType } from '../types';
import { addDays, formatDateKey } from './date';

function sumLogCalories(log: DailyLog | undefined): number {
  return log?.entries.reduce((sum, entry) => sum + entry.calories, 0) ?? 0;
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

export function getTrailingAverageCalories(
  logs: Record<string, DailyLog>,
  endDate: string = formatDateKey(),
  days = 7,
): number {
  const dates = getTrailingDates(endDate, days);
  const total = dates.reduce(
    (sum, date) => sum + sumLogCalories(logs[date]),
    0,
  );
  return Math.round(total / days);
}

export interface DayStat {
  date: string;
  total: number;
  deltaFromTarget: number;
}

export interface PeriodSummary {
  averageDailyCalories: number;
  bestDay: DayStat | null;
  worstDay: DayStat | null;
  days: DayStat[];
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
  target: number,
  goalType: GoalType,
): PeriodSummary {
  const days: DayStat[] = [];
  let cursor = startDate;

  while (cursor <= endDate) {
    const total = sumLogCalories(logs[cursor]);
    days.push({
      date: cursor,
      total,
      deltaFromTarget: total - target,
    });
    cursor = addDays(cursor, 1);
  }

  const loggedDays = days.filter(day => day.total > 0);
  const averageDailyCalories = loggedDays.length
    ? Math.round(
        loggedDays.reduce((sum, day) => sum + day.total, 0) / loggedDays.length,
      )
    : 0;

  const ranked = [...days].sort(
    (a, b) => rankDay(goalType, b.deltaFromTarget) - rankDay(goalType, a.deltaFromTarget),
  );

  return {
    averageDailyCalories,
    bestDay: ranked[0] ?? null,
    worstDay: ranked[ranked.length - 1] ?? null,
    days,
  };
}

export function formatTargetRange(target: number): string {
  const low = Math.max(0, target - TARGET_RANGE_KCAL);
  const high = target + TARGET_RANGE_KCAL;
  return `${low.toLocaleString()}–${high.toLocaleString()} kcal`;
}
