import { FoodLog_dayKey } from "./foodLog";

export interface ITodayPillInput {
  dayName?: string;
  history: { startTime: number }[];
  now: number;
}

export const todayPillRestDay = "Rest day";
export const todayPillDone = "Done today";
export const todayPillUnnamed = "Workout!";

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
