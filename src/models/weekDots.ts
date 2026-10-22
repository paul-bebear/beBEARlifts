import { DateUtils_firstDayOfWeekTimestamp } from "../utils/date";
import { FoodLog_dayKey, FoodLog_shiftDay, IFoodLog } from "./foodLog";

export interface IWeekDot {
  day: string;
  filled: boolean;
  isToday: boolean;
}

export interface IWeekDotsInput {
  history: { startTime: number }[];
  foodLog: IFoodLog;
  now: number;
  startWeekFromMonday?: boolean;
}

const daysInWeek = 7;

export function WeekDots_build(input: IWeekDotsInput): IWeekDot[] {
  const today = FoodLog_dayKey(new Date(input.now));
  const first = FoodLog_dayKey(new Date(DateUtils_firstDayOfWeekTimestamp(input.now, input.startWeekFromMonday)));
  const activeDays = new Set<string>(input.history.map((r) => FoodLog_dayKey(new Date(r.startTime))));
  for (const entry of input.foodLog.entries) {
    activeDays.add(entry.day);
  }
  return Array.from({ length: daysInWeek }, (_, i) => {
    const day = FoodLog_shiftDay(first, i);
    return { day, filled: activeDays.has(day), isToday: day === today };
  });
}
