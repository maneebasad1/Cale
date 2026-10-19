import { formatDateKey, formatDisplayDate } from '../utils/date';
import { getCurrentStreak } from '../utils/streak';
import { calculateRemainingCalories } from '../utils/workoutCalories';
import {
  getAllLogs,
  getProfile,
  getTodayLog,
  getTotalCalories,
} from './storage';
import { pushWidgetSnapshot } from './widgetBridge';

/**
 * Builds a Home-like snapshot and pushes it to the Android widget.
 * Safe to call often; no-ops on iOS / when the native module is missing.
 */
export async function refreshHomeWidget(): Promise<void> {
  try {
    const today = formatDateKey();
    const [profile, log, logs] = await Promise.all([
      getProfile(),
      getTodayLog(),
      getAllLogs(),
    ]);

    if (!profile) {
      await pushWidgetSnapshot({
        hero: 'CALE',
        heroSub: 'Open the app to start',
        eaten: '0',
        target: '0',
        streak: '',
        dateLabel: formatDisplayDate(today),
        isOver: false,
        ready: false,
        dateKey: today,
        targetValue: 0,
        streakCount: 0,
        loggedToday: false,
      });
      return;
    }

    const consumed = getTotalCalories(log);
    const target =
      profile.dailyTargetCalories ?? profile.maintenanceCalories ?? 0;
    const remaining = calculateRemainingCalories(target, consumed);
    const isOver = remaining < 0;
    const streak = getCurrentStreak(logs, today);

    await pushWidgetSnapshot({
      hero: Math.abs(remaining).toLocaleString(),
      heroSub: isOver ? 'kcal over' : 'kcal left',
      eaten: consumed.toLocaleString(),
      target: target.toLocaleString(),
      streak:
        streak > 0
          ? `${streak}-day streak`
          : 'Log today to start a streak',
      dateLabel: formatDisplayDate(today),
      isOver,
      ready: true,
      dateKey: today,
      targetValue: target,
      streakCount: streak,
      loggedToday: log.entries.length > 0,
    });
  } catch {
    // Never surface widget errors to the user.
  }
}
