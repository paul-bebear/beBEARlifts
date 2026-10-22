import type { IHistoryRecord } from "../types";
import { FoodLog_dayKey } from "./foodLog";

export function TodayPill_text(
  nextDayName: string | undefined,
  history: readonly Pick<IHistoryRecord, "startTime">[],
  now: number
): string {
  const today = FoodLog_dayKey(new Date(now));
  if (history.some((record) => FoodLog_dayKey(new Date(record.startTime)) === today)) {
    return "Rest day";
  }
  const name = nextDayName?.trim().replace(/[.!?\s]+$/u, "");
  return name != null && /\p{L}/u.test(name) ? `${name}!` : "Rest day";
}
