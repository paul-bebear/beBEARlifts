import type { IHistoryRecord } from "../types";
import { DateUtils_firstDayOfWeekTimestamp } from "../utils/date";
import { FoodLog_dayKey, FoodLog_shiftDay, IFoodLog } from "./foodLog";

export interface IWeekDot {
  date: string;
  filled: boolean;
}

export function WeekDots_weekStart(now: number, startWeekFromMonday?: boolean): string {
  return FoodLog_dayKey(new Date(DateUtils_firstDayOfWeekTimestamp(now, startWeekFromMonday)));
}

export function WeekDots_build(
  history: readonly Pick<IHistoryRecord, "startTime">[],
  foodLog: IFoodLog,
  now: number,
  startWeekFromMonday?: boolean
): IWeekDot[] {
  const first = WeekDots_weekStart(now, startWeekFromMonday);
  const logged = new Set(history.map((record) => FoodLog_dayKey(new Date(record.startTime))));
  for (const entry of foodLog.entries) {
    logged.add(entry.day);
  }
  return Array.from({ length: 7 }, (_, index) => {
    const date = FoodLog_shiftDay(first, index);
    return { date, filled: logged.has(date) };
  });
}
