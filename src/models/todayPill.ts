import { FoodLog_dayKey } from "./foodLog";
import { IScheduleToday } from "./weekSchedule";

export interface ITodayPillInput {
  dayName?: string;
  history: { startTime: number }[];
  now: number;
}

export const todayPillRestDay = "Rest day";
export const todayPillDone = "Done today";
export const todayPillUnnamed = "Workout!";

// The weekly schedule names today's day. A program with no days falls back to the next day in order.
export function TodayPill_dayName(today: IScheduleToday, nextDayName?: string): string | undefined {
  if (today.kind === "day") {
    return today.name;
  }
  return today.kind === "rest" ? undefined : nextDayName;
}

export function TodayPill_text(input: ITodayPillInput): string {
  const today = FoodLog_dayKey(new Date(input.now));
  if (input.history.some((r) => FoodLog_dayKey(new Date(r.startTime)) === today)) {
    return todayPillDone;
  }
  const name = (input.dayName ?? "").trim().replace(/\s+/g, " ");
  if (name === "") {
    return todayPillRestDay;
  }
  if (!/\p{L}/u.test(name)) {
    return todayPillUnnamed;
  }
  return /[!?.]$/.test(name) ? name : `${name}!`;
}
