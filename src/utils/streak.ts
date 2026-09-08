import type { DailyLog } from '../types';
import { addDays, formatDateKey } from './date';

export function countLoggedDays(logs: Record<string, DailyLog>): number {
  return Object.values(logs).filter(log => log.entries.length > 0).length;
}

export function getCurrentStreak(
  logs: Record<string, DailyLog>,
  today: string = formatDateKey(),
): number {
  let streak = 0;
  let checkDate = today;

  if (!logs[today]?.entries.length) {
    checkDate = addDays(today, -1);
  }

  while (logs[checkDate]?.entries.length) {
    streak += 1;
    checkDate = addDays(checkDate, -1);
  }

  return streak;
}
