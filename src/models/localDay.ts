export const LocalDay_ms = 24 * 60 * 60 * 1000;

export function LocalDay_start(timestamp: number): number {
  const date = new Date(timestamp);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

export function LocalDay_between(earlier: number, later: number): number {
  return Math.round((LocalDay_start(later) - LocalDay_start(earlier)) / LocalDay_ms);
}

function pad2(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

export function LocalDay_key(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

// Noon keeps the date inside the same day when a daylight-saving change moves the clock an hour.
export function LocalDay_parse(day: string): Date {
  const [year, month, date] = day.split("-").map(Number);
  return new Date(year, month - 1, date, 12);
}

export function LocalDay_weekday(day: string): number {
  return LocalDay_parse(day).getDay();
}
