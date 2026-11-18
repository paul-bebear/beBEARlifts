import { FoodLog_dayKey } from "./foodLog";

export function DayKey_at(now: number): string {
  return FoodLog_dayKey(new Date(now));
}

export function DayKey_next(current: string, now: number): string {
  const next = DayKey_at(now);
  return next === current ? current : next;
}
