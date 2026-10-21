import { FoodLog_dayKey, FoodLog_shiftDay } from "./foodLog";

export type IStepsSource = "health" | "manual";

export interface IStepsDay {
  count: number;
  source: IStepsSource;
}

export interface IStepsLog {
  version: 1;
  goal: number;
  syncHealth: boolean;
  days: Record<string, IStepsDay>;
}

export interface IStepsBar {
  day: string;
  count: number;
  isGoalHit: boolean;
  label: string;
}

export interface IStepsChart {
  bars: IStepsBar[];
  top: number;
  average?: number;
  daysHit: number;
  daysWithData: number;
}

export interface IStepsChartLayout {
  bars: { x: number; y: number; width: number; height: number; isGoalHit: boolean; label: string; labelX: number }[];
  goalY: number;
}

export const Steps_defaultGoal = 10000;
export const Steps_chartDays = 14;
export const Steps_goalStep = 500;
const goalLimits = { min: 1000, max: 50000 };
const maxCount = 200000;
const keptDays = 400;
const dayKeyPattern = /^\d{4}-\d{2}-\d{2}$/;
const weekdayLetters = ["S", "M", "T", "W", "T", "F", "S"];

export function Steps_empty(): IStepsLog {
  return { version: 1, goal: Steps_defaultGoal, syncHealth: false, days: {} };
}

function validCount(value: unknown): value is number {
  return typeof value === "number" && isFinite(value) && value >= 0 && value <= maxCount;
}

function prune(days: Record<string, IStepsDay>): Record<string, IStepsDay> {
  const keys = Object.keys(days).sort().reverse().slice(0, keptDays);
  const kept: Record<string, IStepsDay> = {};
  for (const key of keys) {
    kept[key] = days[key];
  }
  return kept;
}

export function Steps_parse(raw: unknown): IStepsLog {
  const r = (raw ?? {}) as Record<string, unknown>;
  const days: Record<string, IStepsDay> = {};
  const rawDays = (r.days ?? {}) as Record<string, unknown>;
  for (const key of Object.keys(rawDays)) {
    const d = (rawDays[key] ?? {}) as Record<string, unknown>;
    if (dayKeyPattern.test(key) && validCount(d.count)) {
      days[key] = { count: Math.round(d.count), source: d.source === "manual" ? "manual" : "health" };
    }
  }
  return {
    version: 1,
    goal: typeof r.goal === "number" && isFinite(r.goal) ? Steps_clampGoal(r.goal) : Steps_defaultGoal,
    syncHealth: r.syncHealth === true,
    days: prune(days),
  };
}

export function Steps_clampGoal(goal: number): number {
  const rounded = Math.round(goal / Steps_goalStep) * Steps_goalStep;
  return Math.min(goalLimits.max, Math.max(goalLimits.min, rounded));
}

export function Steps_setGoal(log: IStepsLog, goal: number): IStepsLog {
  return { ...log, goal: Steps_clampGoal(goal) };
}

export function Steps_setSync(log: IStepsLog, syncHealth: boolean): IStepsLog {
  return { ...log, syncHealth };
}

export function Steps_parseCount(text: string): number | undefined {
  const trimmed = text.trim().replace(/[,.\s]/g, "");
  const n = Number(trimmed);
  return trimmed !== "" && validCount(n) ? Math.round(n) : undefined;
}

export function Steps_setManual(log: IStepsLog, day: string, count: number): IStepsLog {
  const days = { ...log.days };
  if (count <= 0) {
    delete days[day];
  } else {
    days[day] = { count: Math.round(count), source: "manual" };
  }
  return { ...log, days: prune(days) };
}

export function Steps_fromHealth(samples: { timestamp: number; value: number }[]): { day: string; count: number }[] {
  return samples
    .filter((s) => validCount(s.value))
    .map((s) => ({ day: FoodLog_dayKey(new Date(s.timestamp)), count: Math.round(s.value) }));
}

// A count typed by hand stays, because the user typed it to correct what Health had.
export function Steps_mergeHealth(log: IStepsLog, values: { day: string; count: number }[]): IStepsLog {
  const days = { ...log.days };
  for (const { day, count } of values) {
    if (days[day]?.source !== "manual" && dayKeyPattern.test(day) && validCount(count)) {
      days[day] = { count: Math.round(count), source: "health" };
    }
  }
  return { ...log, days: prune(days) };
}

export function Steps_count(log: IStepsLog, day: string): number | undefined {
  return log.days[day]?.count;
}

export function Steps_canGoForward(day: string, today: string): boolean {
  return day < today;
}

function niceCeiling(value: number): number {
  const step = value <= 10000 ? 2000 : 5000;
  return Math.ceil(value / step) * step;
}

function weekdayLetter(day: string): string {
  const [year, month, date] = day.split("-").map(Number);
  return weekdayLetters[new Date(year, month - 1, date, 12).getDay()];
}

export function Steps_chart(log: IStepsLog, endDay: string, length: number = Steps_chartDays): IStepsChart {
  const days = Array.from({ length }, (_, i) => FoodLog_shiftDay(endDay, i - length + 1));
  const bars = days.map((day) => {
    const count = log.days[day]?.count ?? 0;
    return { day, count, isGoalHit: count >= log.goal, label: weekdayLetter(day) };
  });
  const withData = bars.filter((b) => log.days[b.day] != null);
  const total = withData.reduce((sum, b) => sum + b.count, 0);
  const highest = Math.max(log.goal, ...bars.map((b) => b.count));
  return {
    bars,
    top: niceCeiling(highest * 1.1),
    average: withData.length > 0 ? Math.round(total / withData.length) : undefined,
    daysHit: bars.filter((b) => b.isGoalHit).length,
    daysWithData: withData.length,
  };
}

export function Steps_chartLayout(
  chart: IStepsChart,
  goal: number,
  size: { width: number; height: number; labelHeight: number }
): IStepsChartLayout {
  const plotHeight = size.height - size.labelHeight;
  const slot = size.width / Math.max(1, chart.bars.length);
  const barWidth = Math.max(2, Math.round(slot * 0.6 * 10) / 10);
  const yFor = (count: number): number => Math.round((plotHeight - (count / chart.top) * plotHeight) * 10) / 10;
  return {
    bars: chart.bars.map((bar, i) => {
      const y = yFor(bar.count);
      const x = Math.round((i * slot + (slot - barWidth) / 2) * 10) / 10;
      return {
        x,
        y,
        width: barWidth,
        height: Math.round((plotHeight - y) * 10) / 10,
        isGoalHit: bar.isGoalHit,
        label: bar.label,
        labelX: Math.round((i * slot + slot / 2) * 10) / 10,
      };
    }),
    goalY: yFor(goal),
  };
}

export function Steps_format(count: number): string {
  return Math.round(count).toLocaleString("en-US");
}
