export const LocalDay_ms = 24 * 60 * 60 * 1000;

export function LocalDay_start(timestamp: number): number {
  const date = new Date(timestamp);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

export function LocalDay_between(earlier: number, later: number): number {
  return Math.round((LocalDay_start(later) - LocalDay_start(earlier)) / LocalDay_ms);
}
