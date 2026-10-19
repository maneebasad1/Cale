import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { formatDateKey } from '../utils/date';

/** Milliseconds until the next local midnight (plus a small buffer). */
function msUntilNextMidnight(now: Date = new Date()): number {
  const next = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + 1,
    0,
    0,
    1,
  );
  return Math.max(next.getTime() - now.getTime(), 1000);
}

/**
 * Current local date key (YYYY-MM-DD). Updates at local midnight and when the
 * app returns to the foreground, so screens don't keep showing "yesterday".
 */
export function useToday(): string {
  const [today, setToday] = useState(() => formatDateKey());

  useEffect(() => {
    const refresh = () => {
      const next = formatDateKey();
      setToday(current => (current === next ? current : next));
    };

    const sub = AppState.addEventListener('change', state => {
      if (state === 'active') {
        refresh();
      }
    });

    return () => sub.remove();
  }, []);

  useEffect(() => {
    // Re-armed whenever the day changes. If the timer fires early (clock
    // drift / timezone change) and the date hasn't rolled over, re-schedule.
    let timer: ReturnType<typeof setTimeout>;
    const schedule = () => {
      timer = setTimeout(() => {
        const next = formatDateKey();
        if (next === today) {
          schedule();
        } else {
          setToday(next);
        }
      }, msUntilNextMidnight());
    };
    schedule();
    return () => clearTimeout(timer);
  }, [today]);

  return today;
}
