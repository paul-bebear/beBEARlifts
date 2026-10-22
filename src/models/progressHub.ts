import type { IHistoryRecord, ISettings, IStats, IWeight } from "../types";
import { FoodLog_dayKey, FoodLog_shiftDay, IFoodLog } from "./foodLog";
import {
  IProgramGoalLog,
  ProgramGoal_formatWeight,
  ProgramGoal_kindLabel,
  ProgramGoal_paceLabel,
  ProgramGoal_weightIn,
} from "./programGoal";
import { IStepsLog, Steps_count } from "./steps";
import { IProgressPhotoLog } from "./progressPhotos";
import { LocalDay_between, LocalDay_ms, LocalDay_start } from "./localDay";

export interface IProgressHubInput {
  goalLog: IProgramGoalLog;
  history: IHistoryRecord[];
  stats: IStats;
  foodLog: IFoodLog;
  steps: IStepsLog;
  photos: IProgressPhotoLog;
  plannedPerWeek: number;
  settings: ISettings;
  now: number;
}

export type IProgressHubTone = "neutral" | "good" | "warn";

export interface IProgressHub {
  goal?: { title: string; pace: string; started: string; startWeight?: string; canChangePace: boolean };
  weight: { value?: string; subtitle: string; change?: string };
  nutrition: {
    daysLogged: number;
    daysTracked: number;
    since: string;
  };
  consistency: { percent: number; done: number; planned: number; windowDays: number };
  steps: { today?: number; goal: number; fraction: number };
  photos: { count: number; subtitle: string };
}

const defaultPlannedPerWeek = 3;
const consistencyDays = { min: 7, max: 28 };
const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function ProgressHub_formatDate(timestamp: number, now: number): string {
  const date = new Date(timestamp);
  const monthDay = `${monthNames[date.getMonth()]} ${date.getDate()}`;
  return date.getFullYear() === new Date(now).getFullYear() ? monthDay : `${monthDay}, ${date.getFullYear()}`;
}

export function ProgressHub_plannedPerWeek(weeks: { days: unknown[] }[] | undefined): number {
  const withDays = (weeks ?? []).filter((w) => w.days.length > 0);
  if (withDays.length === 0) {
    return defaultPlannedPerWeek;
  }
  const average = withDays.reduce((sum, w) => sum + w.days.length, 0) / withDays.length;
  return Math.min(7, Math.max(1, Math.round(average)));
}

function loggedAgo(daysAgo: number): string {
  if (daysAgo <= 0) {
    return "Logged today";
  }
  return daysAgo === 1 ? "Logged yesterday" : `Logged ${daysAgo} days ago`;
}

function weightRow(input: IProgressHubInput): IProgressHub["weight"] {
  const { stats, settings, now, goalLog } = input;
  const latest = (stats.weight.weight ?? []).reduce<{ value: IWeight; timestamp: number } | undefined>(
    (best, v) => (best == null || v.timestamp > best.timestamp ? v : best),
    undefined
  );
  if (latest == null) {
    return { subtitle: "Tap to log your weight" };
  }
  const startWeight = goalLog.current?.startWeight;
  const delta =
    startWeight != null
      ? Math.round(
          (ProgramGoal_weightIn(latest.value, settings.units) - ProgramGoal_weightIn(startWeight, settings.units)) * 10
        ) / 10
      : undefined;
  return {
    value: ProgramGoal_formatWeight(latest.value, settings.units),
    subtitle: loggedAgo(LocalDay_between(latest.timestamp, now)),
    change: delta != null ? `${delta > 0 ? "+" : ""}${delta} ${settings.units} since the goal started` : undefined,
  };
}

function nutritionRow(input: IProgressHubInput): IProgressHub["nutrition"] {
  const { foodLog, now, goalLog } = input;
  const today = FoodLog_dayKey(new Date(now));
  const startedAt = goalLog.current?.startedAt;
  const daysTracked = startedAt != null ? Math.max(1, LocalDay_between(startedAt, now) + 1) : 7;
  const firstDay = FoodLog_shiftDay(today, -(daysTracked - 1));
  const logged = new Set(foodLog.entries.map((e) => e.day).filter((d) => d >= firstDay && d <= today));
  return {
    daysLogged: logged.size,
    daysTracked,
    since: startedAt != null ? "since the goal started" : "in the last 7 days",
  };
}

function consistencyRow(input: IProgressHubInput): IProgressHub["consistency"] {
  const { history, now, goalLog, plannedPerWeek } = input;
  const startedAt = goalLog.current?.startedAt;
  const sinceStart = startedAt != null ? LocalDay_between(startedAt, now) + 1 : consistencyDays.max;
  const windowDays = Math.min(consistencyDays.max, Math.max(consistencyDays.min, sinceStart));
  const windowStart = LocalDay_start(now) - (windowDays - 1) * LocalDay_ms;
  const done = history.filter((r) => r.startTime >= windowStart && r.startTime <= now).length;
  const planned = Math.max(1, Math.round((plannedPerWeek * windowDays) / 7));
  return { percent: Math.min(100, Math.round((done / planned) * 100)), done, planned, windowDays };
}

function photosRow(photos: IProgressPhotoLog, now: number): IProgressHub["photos"] {
  const latest = photos.photos[0];
  if (latest == null) {
    return { count: 0, subtitle: "Add your first photo" };
  }
  const count = photos.photos.length;
  return {
    count,
    subtitle: `${count} ${count === 1 ? "photo" : "photos"} · latest ${ProgressHub_formatDate(latest.timestamp, now)}`,
  };
}

export function ProgressHub_build(input: IProgressHubInput): IProgressHub {
  const { goalLog, steps, photos, settings, now } = input;
  const goal = goalLog.current;
  const today = Steps_count(steps, FoodLog_dayKey(new Date(now)));
  return {
    goal:
      goal == null
        ? undefined
        : {
            title: ProgramGoal_kindLabel(goal.kind),
            pace: ProgramGoal_paceLabel(goal.kind, goal.pace),
            started: ProgressHub_formatDate(goal.startedAt, now),
            startWeight:
              goal.startWeight != null ? ProgramGoal_formatWeight(goal.startWeight, settings.units) : undefined,
            canChangePace: goal.kind !== "maintain",
          },
    weight: weightRow(input),
    nutrition: nutritionRow(input),
    consistency: consistencyRow(input),
    steps: { today, goal: steps.goal, fraction: Math.min(1, (today ?? 0) / steps.goal) },
    photos: photosRow(photos, now),
  };
}
