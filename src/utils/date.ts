export function formatDateKey(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatDisplayDate(dateKey: string): string {
  const [year, month, day] = dateKey.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatShortDate(dateKey: string): string {
  const [year, month, day] = dateKey.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

export function isToday(dateKey: string): boolean {
  return dateKey === formatDateKey();
}

export function isFutureDate(dateKey: string): boolean {
  return dateKey > formatDateKey();
}

export function addDays(dateKey: string, delta: number): string {
  const [year, month, day] = dateKey.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + delta);
  return formatDateKey(date);
}

export function getWeekStart(dateKey: string): string {
  const [year, month, day] = dateKey.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  const weekday = date.getDay();
  const mondayOffset = weekday === 0 ? -6 : 1 - weekday;
  date.setDate(date.getDate() + mondayOffset);
  return formatDateKey(date);
}

export function getMonthStart(dateKey: string): string {
  const [year, month] = dateKey.split('-').map(Number);
  return `${year}-${String(month).padStart(2, '0')}-01`;
}

export function getMonthEnd(dateKey: string): string {
  const [year, month] = dateKey.split('-').map(Number);
  const date = new Date(year, month, 0);
  return formatDateKey(date);
}

export function getYesterdayKey(today: string = formatDateKey()): string {
  return addDays(today, -1);
}
