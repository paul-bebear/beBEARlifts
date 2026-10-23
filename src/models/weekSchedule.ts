import { FoodLog_dayKey } from "./foodLog";

// Seven entries, Monday first. Each holds the index of a program day within its week, or null for rest.
export type IWeekSlots = (number | null)[];

export interface IWeekScheduleLog {
  version: 1;
  programs: Record<string, IWeekSlots>;
  // Program id to the YYYY-MM-DD day when the next workout last moved to the weekday's planned day.
  followedOn?: Record<string, string>;
}

export interface IScheduleProgram {
  nextDay: number;
  weeks: { days: { name: string }[] }[];
}

export type IScheduleToday =
  | { kind: "day"; weekday: number; day: number; name: string }
  | { kind: "rest"; weekday: number }
  | { kind: "none"; weekday: number };

export type IStartChoice =
  | { kind: "today"; day: number; todayName: string; nextName: string }
  | { kind: "rest"; nextName: string }
  | { kind: "next" };

const dayKeyPattern = /^\d{4}-\d{2}-\d{2}$/;

export const WeekSchedule_weekdayNames = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

// Rest days sit between the hard days: 3 days is Mon, Wed, Fri, and 5 days is Mon, Tue, Thu, Fri, Sat.
const defaultWeekdays: number[][] = [
  [],
  [0],
  [0, 3],
  [0, 2, 4],
  [0, 1, 3, 4],
  [0, 1, 3, 4, 5],
  [0, 1, 2, 3, 4, 5],
  [0, 1, 2, 3, 4, 5, 6],
];

export function WeekSchedule_empty(): IWeekScheduleLog {
  return { version: 1, programs: {} };
}

function parseSlots(raw: unknown): IWeekSlots | undefined {
  if (!Array.isArray(raw) || raw.length !== 7) {
    return undefined;
  }
  return raw.map((v) => (typeof v === "number" && Number.isInteger(v) && v >= 0 ? v : null));
}

export function WeekSchedule_parse(raw: unknown): IWeekScheduleLog {
  const r = (raw ?? {}) as Record<string, unknown>;
  const programs: Record<string, IWeekSlots> = {};
  if (r.programs != null && typeof r.programs === "object") {
    for (const [id, value] of Object.entries(r.programs as Record<string, unknown>)) {
      const slots = parseSlots(value);
      if (slots != null) {
        programs[id] = slots;
      }
    }
  }
  const followedOn: Record<string, string> = {};
  if (r.followedOn != null && typeof r.followedOn === "object") {
    for (const [id, value] of Object.entries(r.followedOn as Record<string, unknown>)) {
      if (typeof value === "string" && dayKeyPattern.test(value)) {
        followedOn[id] = value;
      }
    }
  }
  return Object.keys(followedOn).length > 0 ? { version: 1, programs, followedOn } : { version: 1, programs };
}

export function WeekSchedule_default(dayCount: number): IWeekSlots {
  const slots: IWeekSlots = [null, null, null, null, null, null, null];
  (defaultWeekdays[Math.min(dayCount, 7)] ?? []).forEach((weekday, dayIndex) => {
    slots[weekday] = dayIndex;
  });
  return slots;
}

// A saved schedule outlives edits to the program text, so days that no longer exist are dropped
// and new days go on the first free weekdays.
export function WeekSchedule_resolve(stored: IWeekSlots | undefined, dayCount: number): IWeekSlots {
  if (stored == null) {
    return WeekSchedule_default(dayCount);
  }
  const seen = new Set<number>();
  const slots = stored.map((v) => {
    if (v == null || v >= dayCount || seen.has(v)) {
      return null;
    }
    seen.add(v);
    return v;
  });
  for (let dayIndex = 0; dayIndex < dayCount; dayIndex += 1) {
    const free = slots.indexOf(null);
    if (!seen.has(dayIndex) && free >= 0) {
      slots[free] = dayIndex;
    }
  }
  return slots;
}

export function WeekSchedule_dayCount(program: IScheduleProgram): number {
  return Math.max(0, ...program.weeks.map((week) => week.days.length));
}

export function WeekSchedule_forProgram(log: IWeekScheduleLog, programId: string, dayCount: number): IWeekSlots {
  return WeekSchedule_resolve(log.programs[programId], dayCount);
}

// Moving onto a weekday that holds another day swaps the two.
export function WeekSchedule_move(slots: IWeekSlots, from: number, to: number): IWeekSlots {
  const next = slots.slice();
  next[to] = slots[from] ?? null;
  next[from] = slots[to] ?? null;
  return next;
}

export function WeekSchedule_save(log: IWeekScheduleLog, programId: string, slots: IWeekSlots): IWeekScheduleLog {
  return { ...log, programs: { ...log.programs, [programId]: slots } };
}

export function WeekSchedule_weekday(date: Date): number {
  return (date.getDay() + 6) % 7;
}

export function WeekSchedule_moveDay(
  log: IWeekScheduleLog,
  programId: string,
  dayCount: number,
  from: number,
  to: number
): IWeekScheduleLog {
  const slots = WeekSchedule_forProgram(log, programId, dayCount);
  return WeekSchedule_save(log, programId, WeekSchedule_move(slots, from, to));
}

export function WeekSchedule_workedOutToday(history: { startTime: number }[], now: number): boolean {
  const today = FoodLog_dayKey(new Date(now));
  return history.some((record) => FoodLog_dayKey(new Date(record.startTime)) === today);
}

function dayNumber(program: IScheduleProgram, weekIndex: number, dayIndex: number): number | undefined {
  const week = program.weeks[weekIndex];
  if (week == null || dayIndex >= week.days.length) {
    return undefined;
  }
  return program.weeks.slice(0, weekIndex).reduce((sum, w) => sum + w.days.length, 0) + dayIndex + 1;
}

function weekIndexOf(program: IScheduleProgram, day: number): number {
  let total = 0;
  for (let i = 0; i < program.weeks.length; i += 1) {
    total += program.weeks[i].days.length;
    if (total >= day) {
      return i;
    }
  }
  return 0;
}

function WeekSchedule_dayName(program: IScheduleProgram, day: number): string {
  let left = day;
  for (const week of program.weeks) {
    if (left <= week.days.length) {
      return week.days[left - 1]?.name ?? "";
    }
    left -= week.days.length;
  }
  return "";
}

// Today's day comes from the week the next workout is in. If that day is already behind the next
// workout, the calendar has moved on, so it is taken from the following week.
export function WeekSchedule_today(program: IScheduleProgram, slots: IWeekSlots, now: number): IScheduleToday {
  const weekday = WeekSchedule_weekday(new Date(now));
  if (WeekSchedule_dayCount(program) === 0) {
    return { kind: "none", weekday };
  }
  const dayIndex = slots[weekday];
  if (dayIndex == null) {
    return { kind: "rest", weekday };
  }
  const weekIndex = weekIndexOf(program, program.nextDay);
  let day = dayNumber(program, weekIndex, dayIndex);
  if (day != null && day < program.nextDay) {
    day = dayNumber(program, (weekIndex + 1) % program.weeks.length, dayIndex);
  }
  if (day == null) {
    return { kind: "rest", weekday };
  }
  return { kind: "day", weekday, day, name: WeekSchedule_dayName(program, day) };
}

export function WeekSchedule_todayFor(
  log: IWeekScheduleLog,
  program: IScheduleProgram & { id: string },
  now: number
): IScheduleToday {
  const slots = WeekSchedule_forProgram(log, program.id, WeekSchedule_dayCount(program));
  return WeekSchedule_today(program, slots, now);
}

export function WeekSchedule_startChoice(
  program: IScheduleProgram,
  today: IScheduleToday,
  opts: { workedOutToday: boolean; hasProgress: boolean }
): IStartChoice {
  if (opts.workedOutToday || opts.hasProgress) {
    return { kind: "next" };
  }
  const nextName = WeekSchedule_dayName(program, program.nextDay);
  if (today.kind === "rest") {
    return { kind: "rest", nextName };
  }
  if (today.kind === "day" && today.day !== program.nextDay) {
    return { kind: "today", day: today.day, todayName: today.name, nextName };
  }
  return { kind: "next" };
}

// On the first look of the day the next workout moves to the weekday's planned day, so Home, the
// Workout tab and the watch all show it. A day picked by hand after that stands until tomorrow.
// A running workout waits: the move happens after it is finished or dropped.
export function WeekSchedule_follow(
  log: IWeekScheduleLog,
  program: IScheduleProgram & { id: string },
  opts: { now: number; workedOutToday: boolean; hasProgress: boolean }
): { log: IWeekScheduleLog; nextDay?: number } | undefined {
  const today = FoodLog_dayKey(new Date(opts.now));
  if (opts.hasProgress || log.followedOn?.[program.id] === today) {
    return undefined;
  }
  const followed: IWeekScheduleLog = { ...log, followedOn: { ...log.followedOn, [program.id]: today } };
  const choice = WeekSchedule_startChoice(program, WeekSchedule_todayFor(log, program, opts.now), opts);
  return choice.kind === "today" ? { log: followed, nextDay: choice.day } : { log: followed };
}

// The day the Plan tab tags as Next: the one the start sheet offers first.
export function WeekSchedule_upNextDay(
  program: IScheduleProgram,
  today: IScheduleToday,
  workedOutToday: boolean
): number {
  const choice = WeekSchedule_startChoice(program, today, { workedOutToday, hasProgress: false });
  return choice.kind === "today" ? choice.day : program.nextDay;
}
