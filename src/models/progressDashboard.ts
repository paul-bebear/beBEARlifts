import { IHistoryRecord, ISettings, IStats, IWeight } from "../types";
import { FoodLog_shiftDay, IFoodLog } from "./foodLog";
import { History_totalRecordWeight } from "./history";
import { Weight_add, Weight_build } from "./weight";
import { LocalDay_key, LocalDay_ms, LocalDay_start } from "./localDay";

export const ProgressDashboard_days = 7;

export interface IProgressDashboard {
  nutrition: { daysLogged: number };
  workouts: { count: number; volume: IWeight; weekStreak: number };
}

// A week here is the 7 days ending today, so the streak does not reset on a Monday with no workout yet.
function weekStreak(workoutTimes: number[], now: number): number {
  let streak = 0;
  for (let week = 0; ; week += 1) {
    const end = LocalDay_start(now) + LocalDay_ms - week * ProgressDashboard_days * LocalDay_ms;
    const start = end - ProgressDashboard_days * LocalDay_ms;
    if (!workoutTimes.some((t) => t >= start && t < end)) {
      return streak;
    }
    streak += 1;
  }
}

export function ProgressDashboard_workoutsLine(workouts: IProgressDashboard["workouts"]): string {
  const volume = `${Math.round(workouts.volume.value).toLocaleString("en-US")} ${workouts.volume.unit} lifted`;
  return workouts.weekStreak > 1 ? `${volume} · ${workouts.weekStreak}-week streak` : volume;
}

// screenProgressDashboard.tsx still passes stats. That file is outside this batch, so the field stays.
export function ProgressDashboard_build(input: {
  history: IHistoryRecord[];
  stats: IStats;
  foodLog: IFoodLog;
  settings: ISettings;
  now: number;
}): IProgressDashboard {
  const { history, foodLog, settings, now } = input;
  const today = LocalDay_key(new Date(now));
  const lastDays = Array.from({ length: ProgressDashboard_days }, (_, i) => FoodLog_shiftDay(today, -i));
  const loggedDays = new Set(foodLog.entries.map((e) => e.day));
  const windowStart = LocalDay_start(now) - (ProgressDashboard_days - 1) * LocalDay_ms;
  const recent = history.filter((r) => r.startTime >= windowStart && r.startTime <= now);
  return {
    nutrition: { daysLogged: lastDays.filter((d) => loggedDays.has(d)).length },
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
