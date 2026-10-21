import type { IStats, IUnit, IWeight } from "../types";
import { FoodLog_dayKey, FoodLog_dayTotals, FoodLog_shiftDay, IFoodLog } from "./foodLog";
import { MonthCalendar_dayTitle } from "./monthCalendar";
import { ProgramGoal_formatWeight } from "./programGoal";

export type IChecklistItemKey = "weight" | "food" | "checkIn";

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

export interface IChecklistDayInput extends IChecklistSources {
  day: string;
  today: string;
  units: IUnit;
  goalStartedAt?: number;
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

function daysBetween(earlier: string, later: string): number {
  const [a, b] = [earlier, later].map((d) => {
    const [year, month, date] = d.split("-").map(Number);
    return Date.UTC(year, month - 1, date);
  });
  return Math.round((b - a) / (24 * 60 * 60 * 1000));
}

// The weekly check-in falls on the weekday the goal started, so a goal set on a Thursday checks in on Thursdays.
export function DailyChecklist_hasCheckIn(day: string, goalStartedAt: number | undefined): boolean {
  const weekday = goalStartedAt != null ? new Date(goalStartedAt).getDay() : monday;
  return weekdayOf(day) === weekday;
}

function weightItem(input: IChecklistDayInput): IChecklistItem {
  const { stats, day, units } = input;
  const upToDay = (stats.weight.weight ?? []).filter((w) => dayOf(w.timestamp) <= day);
  const latest = upToDay.reduce<{ value: IWeight; timestamp: number } | undefined>(
    (best, w) => (best == null || w.timestamp > best.timestamp ? w : best),
    undefined
  );
  const isDone = latest != null && dayOf(latest.timestamp) === day;
  let subtitle = "No weight logged yet";
  if (latest != null) {
    const ago = daysBetween(dayOf(latest.timestamp), day);
    const when = ago === 0 ? "today" : ago === 1 ? "1 day ago" : `${ago} days ago`;
    subtitle = `Last: ${ProgramGoal_formatWeight(latest.value, units)} · ${when}`;
  }
  return { key: "weight", title: "Log your weight", subtitle, isDone };
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
  return { key: "food", title: "Update your food log", subtitle, isDone: count > 0 };
}

function checkInItem(input: IChecklistDayInput): IChecklistItem {
  const isDone = input.log.checkIns.includes(input.day);
  return {
    key: "checkIn",
    title: "Nutrition check-in",
    subtitle: isDone ? "Checked in. Tap to undo" : "Tap when you have looked back at this week's eating",
    isDone,
  };
}

export function DailyChecklist_build(input: IChecklistDayInput): IChecklistDay {
  const items = [weightItem(input), foodItem(input)];
  if (DailyChecklist_hasCheckIn(input.day, input.goalStartedAt) || input.log.checkIns.includes(input.day)) {
    items.push(checkInItem(input));
  }
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

export function DailyChecklist_greeting(hour: number): string {
  if (hour < 12) {
    return "Morning, there!";
  }
  return hour < 18 ? "Afternoon, there!" : "Evening, there!";
}
