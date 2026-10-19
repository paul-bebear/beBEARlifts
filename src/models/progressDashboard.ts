import { IHistoryRecord, ISettings, IStats, IWeight } from "../types";
import { FoodLog_dayKey, FoodLog_dayTotals, FoodLog_shiftDay, IFoodLog } from "./foodLog";
import { History_totalRecordWeight } from "./history";
import { Weight_add, Weight_build, Weight_convertTo } from "./weight";

export const ProgressDashboard_days = 7;

export type IProgressCaloriesStatus =
  | { kind: "none" }
  | { kind: "below"; calories: number }
  | { kind: "onTarget" }
  | { kind: "over"; calories: number };

export interface IProgressDashboard {
  weight?: { value: IWeight; daysAgo: number };
  nutrition: { daysLogged: number; today: IProgressCaloriesStatus };
  workouts: { count: number; volume: IWeight; weekStreak: number };
}

const dayMs = 24 * 60 * 60 * 1000;

function startOfDay(timestamp: number): number {
  const date = new Date(timestamp);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

function daysBetween(earlier: number, later: number): number {
  return Math.round((startOfDay(later) - startOfDay(earlier)) / dayMs);
}

function latestWeight(stats: IStats, settings: ISettings, now: number): IProgressDashboard["weight"] {
  const values = stats.weight.weight ?? [];
  const latest = values.reduce<(typeof values)[number] | undefined>(
    (best, v) => (best == null || v.timestamp > best.timestamp ? v : best),
    undefined
  );
  if (latest == null) {
    return undefined;
  }
  return {
    value: Weight_convertTo(latest.value, settings.units),
    daysAgo: Math.max(0, daysBetween(latest.timestamp, now)),
  };
}

function caloriesStatus(log: IFoodLog, today: string): IProgressCaloriesStatus {
  const calories = FoodLog_dayTotals(log, today).calories;
  const target = log.goals.calories;
  if (calories === 0) {
    return { kind: "none" };
  }
  if (calories < target.min) {
    return { kind: "below", calories: target.min - calories };
  }
  if (calories > target.max) {
    return { kind: "over", calories: calories - target.max };
  }
  return { kind: "onTarget" };
}

// A week here is the 7 days ending today, so the streak does not reset on a Monday with no workout yet.
function weekStreak(workoutTimes: number[], now: number): number {
  let streak = 0;
  for (let week = 0; ; week += 1) {
    const end = startOfDay(now) + dayMs - week * ProgressDashboard_days * dayMs;
    const start = end - ProgressDashboard_days * dayMs;
    if (!workoutTimes.some((t) => t >= start && t < end)) {
      return streak;
    }
    streak += 1;
  }
}

export function ProgressDashboard_loggedAgo(daysAgo: number): string {
  if (daysAgo === 0) {
    return "Logged today";
  }
  return daysAgo === 1 ? "Logged yesterday" : `Logged ${daysAgo} days ago`;
}

export function ProgressDashboard_caloriesPill(
  status: IProgressCaloriesStatus
): { text: string; tone: "neutral" | "good" | "warn" } | undefined {
  switch (status.kind) {
    case "none":
      return undefined;
    case "below":
      return { text: `${status.calories} Cal left`, tone: "neutral" };
    case "onTarget":
      return { text: "On target", tone: "good" };
    case "over":
      return { text: `${status.calories} Cal over`, tone: "warn" };
  }
}

export function ProgressDashboard_workoutsLine(workouts: IProgressDashboard["workouts"]): string {
  const volume = `${Math.round(workouts.volume.value).toLocaleString("en-US")} ${workouts.volume.unit} lifted`;
  return workouts.weekStreak > 1 ? `${volume} · ${workouts.weekStreak}-week streak` : volume;
}

export function ProgressDashboard_build(input: {
  history: IHistoryRecord[];
  stats: IStats;
  foodLog: IFoodLog;
  settings: ISettings;
  now: number;
}): IProgressDashboard {
  const { history, stats, foodLog, settings, now } = input;
  const today = FoodLog_dayKey(new Date(now));
  const lastDays = Array.from({ length: ProgressDashboard_days }, (_, i) => FoodLog_shiftDay(today, -i));
  const loggedDays = new Set(foodLog.entries.map((e) => e.day));
  const windowStart = startOfDay(now) - (ProgressDashboard_days - 1) * dayMs;
  const recent = history.filter((r) => r.startTime >= windowStart && r.startTime <= now);
  return {
    weight: latestWeight(stats, settings, now),
    nutrition: {
      daysLogged: lastDays.filter((d) => loggedDays.has(d)).length,
      today: caloriesStatus(foodLog, today),
    },
    workouts: {
      count: recent.length,
      volume: recent.reduce(
        (sum, r) => Weight_add(sum, History_totalRecordWeight(r, settings)),
        Weight_build(0, settings.units)
      ),
      weekStreak: weekStreak(
        history.map((r) => r.startTime),
        now
      ),
    },
  };
}
