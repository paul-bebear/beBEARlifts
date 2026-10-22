import type { IStats, IUnit, IWeight } from "../types";
import { FoodLog_dayKey, FoodLog_dayTotals, FoodLog_shiftDay, IFoodLog } from "./foodLog";
import { MonthCalendar_dayTitle } from "./monthCalendar";
import { ProgramGoal_formatWeight } from "./programGoal";

export type IChecklistItemKey = "train" | "food" | "weight";

export interface IChecklistLog {
  version: 1;
  checkIns: string[];
  committedAt?: number;
}

export interface IChecklistItem {
  key: IChecklistItemKey;
  title: string;
  subtitle: string;
  isDone: boolean;
}

export interface IChecklistDay {
  day: string;
  title: string;
  items: IChecklistItem[];
  doneCount: number;
}

export interface IChecklistSources {
  stats: IStats;
  foodLog: IFoodLog;
  log: IChecklistLog;
}

export interface IChecklistDayInput extends Omit<IChecklistSources, "log"> {
  day: string;
  today: string;
  units: IUnit;
  workoutDays: ReadonlySet<string>;
  goalStartedAt?: number;
  startWeekFromMonday?: boolean;
}

const dayKeyPattern = /^\d{4}-\d{2}-\d{2}$/;
const maxCheckIns = 400;
const monday = 1;

export function DailyChecklist_empty(): IChecklistLog {
  return { version: 1, checkIns: [] };
}

export function DailyChecklist_parse(raw: unknown): IChecklistLog {
  const r = (raw ?? {}) as Record<string, unknown>;
  const checkIns = Array.isArray(r.checkIns)
    ? r.checkIns.filter((d): d is string => typeof d === "string" && dayKeyPattern.test(d))
    : [];
  const log: IChecklistLog = { version: 1, checkIns: Array.from(new Set(checkIns)).sort().slice(-maxCheckIns) };
  if (typeof r.committedAt === "number" && isFinite(r.committedAt)) {
    log.committedAt = r.committedAt;
  }
  return log;
}

export function DailyChecklist_toggleCheckIn(log: IChecklistLog, day: string): IChecklistLog {
  const checkIns = log.checkIns.includes(day)
    ? log.checkIns.filter((d) => d !== day)
    : [...log.checkIns, day].sort().slice(-maxCheckIns);
  return { ...log, checkIns };
}

export function DailyChecklist_commit(log: IChecklistLog, now: number): IChecklistLog {
  return { ...log, committedAt: now };
}

function dayOf(timestamp: number): string {
  return FoodLog_dayKey(new Date(timestamp));
}

function weekdayOf(day: string): number {
  const [year, month, date] = day.split("-").map(Number);
  return new Date(year, month - 1, date, 12).getDay();
}

const weekdayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

// The goal store keeps only startedAt, so the weigh-in weekday is the weekday the goal started.
// Without a goal it is the first day of the user's week.
export function DailyChecklist_weighInWeekday(
  goalStartedAt: number | undefined,
  startWeekFromMonday?: boolean
): number {
  if (goalStartedAt != null) {
    return new Date(goalStartedAt).getDay();
  }
  return startWeekFromMonday ? monday : 0;
}

function trainItem(input: IChecklistDayInput): IChecklistItem {
  const isDone = input.workoutDays.has(input.day);
  const subtitle = isDone ? "Workout done" : input.day === input.today ? "Do today's workout" : "No workout";
  return { key: "train", title: "Train", subtitle, isDone };
}

function weightItem(input: IChecklistDayInput): IChecklistItem {
  const { stats, day, units } = input;
  const weekday = DailyChecklist_weighInWeekday(input.goalStartedAt, input.startWeekFromMonday);
  const weekStart = FoodLog_shiftDay(day, -((weekdayOf(day) - weekday + 7) % 7));
  const upToDay = (stats.weight.weight ?? []).filter((w) => dayOf(w.timestamp) <= day);
  const latestOf = (list: typeof upToDay): IWeight | undefined =>
    list.reduce<{ value: IWeight; timestamp: number } | undefined>(
      (best, w) => (best == null || w.timestamp > best.timestamp ? w : best),
      undefined
    )?.value;
  const inWeek = upToDay.filter((w) => dayOf(w.timestamp) >= weekStart);
  const weekWeight = latestOf(inWeek);
  const lastWeight = latestOf(upToDay);
  const isDone = weekWeight != null;
  const every = `Weekly, every ${weekdayNames[weekday]}`;
  let subtitle = every;
  if (weekWeight != null) {
    subtitle = `Done this week · ${ProgramGoal_formatWeight(weekWeight, units)}`;
  } else if (lastWeight != null) {
    subtitle = `${every} · Last: ${ProgramGoal_formatWeight(lastWeight, units)}`;
  }
  return { key: "weight", title: "Weigh-in", subtitle, isDone };
}

function foodItem(input: IChecklistDayInput): IChecklistItem {
  const { foodLog, day, today } = input;
  const count = foodLog.entries.filter((e) => e.day === day).length;
  const calories = Math.round(FoodLog_dayTotals(foodLog, day).calories);
  const subtitle =
    count > 0
      ? `${count} ${count === 1 ? "item" : "items"} · ${calories.toLocaleString("en-US")} Cal`
      : day === today
        ? "Start logging today"
        : "Nothing logged";
  return { key: "food", title: "Feed the bear", subtitle, isDone: count > 0 };
}

export function DailyChecklist_build(input: IChecklistDayInput): IChecklistDay {
  const items = [trainItem(input), foodItem(input), weightItem(input)];
  return {
    day: input.day,
    title: `${MonthCalendar_dayTitle(input.day)}'s checklist`,
    items,
    doneCount: items.filter((i) => i.isDone).length,
  };
}

export function DailyChecklist_doneDays(sources: IChecklistSources): Set<string> {
  const days = new Set<string>(sources.log.checkIns);
  for (const w of sources.stats.weight.weight ?? []) {
    days.add(dayOf(w.timestamp));
  }
  for (const e of sources.foodLog.entries) {
    days.add(e.day);
  }
  return days;
}

// Today still counts as open until midnight, so an empty today does not break the streak.
export function DailyChecklist_streak(doneDays: Set<string>, today: string): number {
  let day = doneDays.has(today) ? today : FoodLog_shiftDay(today, -1);
  let streak = 0;
  while (doneDays.has(day)) {
    streak += 1;
    day = FoodLog_shiftDay(day, -1);
  }
  return streak;
}
