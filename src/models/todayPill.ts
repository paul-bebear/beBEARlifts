import { LocalDay_between } from "./localDay";
import { IScheduleToday } from "./weekSchedule";

export interface ITodayPillInput {
  dayName?: string;
  history: { startTime: number }[];
  now: number;
}

const todayPillRestDay = "Rest day";
const todayPillDone = "Done today";
const todayPillUnnamed = "Workout!";

// The weekly schedule names today's day. A program with no days falls back to the next day in order.
export function TodayPill_dayName(today: IScheduleToday, nextDayName?: string): string | undefined {
  if (today.kind === "day") {
    return today.name;
  }
  return today.kind === "rest" ? undefined : nextDayName;
}

export function TodayPill_text(input: ITodayPillInput): string {
  if (input.history.some((r) => LocalDay_between(r.startTime, input.now) === 0)) {
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
