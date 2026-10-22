import { FoodLog_dayKey } from "./foodLog";

export function ExportFilename_dated(prefix: string, now: number): string {
  return `${prefix}${FoodLog_dayKey(new Date(now))}.json`;
}
