import { IHistoryRecord, ISettings, IStats } from "../types";
import { IFoodLog } from "./foodLog";
import { BearGrowth_history, IBearCountedWorkout } from "./bearGrowth";
import { BearStoreData_empty, IBearLine, IBearStoreData } from "./bearStoreData";
import { BearTier_all, BearTier_progress, BearTier_setFor, IBearTierProgress, IBearTierSet } from "./bearTier";
import { History_getPersonalRecords } from "./history";

export type IBearMood = "pumped" | "tired" | "hungry" | "normal";

export interface IBearSources {
  history: readonly IHistoryRecord[];
  foodLog: IFoodLog;
  stats: IStats;
  settings: ISettings;
  plannedDaysPerWeek?: number;
  bear?: IBearStoreData;
  defaultLine?: IBearLine;
}

export interface IBearState {
  line: IBearLine;
  tierSet: IBearTierSet;
  level: IBearTierProgress;
  countedKg: number;
  fullness: number;
  energy: number;
  mood: IBearMood;
  lastCountedWorkoutAt?: number;
  workouts: IBearCountedWorkout[];
}

const hourMs = 3600000;
const pumpedHours = 2;
const pumpedHoursAfterRecord = 24;

function feedingAge(start: number, now: number, workouts: IBearCountedWorkout[]): number {
  let acceleratedMs = 0;
  let coveredUntil = start;
  for (const { record } of workouts) {
    const from = Math.max(start, coveredUntil, record.endTime!);
    const to = Math.min(now, record.endTime! + 24 * hourMs);
    if (to > from) {
      acceleratedMs += to - from;
      coveredUntil = to;
    }
  }
  return (now - start + acceleratedMs / 3) / hourMs;
}

export function Bear_state(sources: IBearSources, now: number): IBearState {
  const history = sources.history.filter((record) => record.endTime != null && record.endTime <= now);
  const growth = BearGrowth_history(history, sources.settings, sources.stats);
  const store = sources.bear ?? BearStoreData_empty();
  const tierSet = BearTier_setFor(sources.foodLog.profile.sex, store.line);
  const reached = BearTier_all(tierSet)
    .filter((tier) => tier.level <= store.celebratedLevel)
    .slice(-1)[0];
  const level = BearTier_progress(reached?.minKg ?? 0, growth.countedKg, tierSet);
  const fadeHours = Math.max(18, 36 - 2 * (level.tier.level - 1));
  const fullness = Math.min(
    100,
    sources.foodLog.entries.reduce((total, entry) => {
      if (entry.createdAt > now || !Number.isFinite(entry.createdAt) || !Number.isFinite(entry.nutrients.calories)) {
        return total;
      }
      const points = 25 * Math.max(0, Math.min(1, entry.nutrients.calories / 400));
      return total + points * Math.max(0, 1 - feedingAge(entry.createdAt, now, growth.workouts) / fadeHours);
    }, 0)
  );
  const last = growth.workouts.slice(-1)[0]?.record;
  const lastCountedWorkoutAt = last?.endTime;
  const plannedDays = sources.plannedDaysPerWeek;
  const graceHours =
    plannedDays != null && Number.isFinite(plannedDays) && plannedDays > 0 ? 168 / Math.min(7, plannedDays) : 168;
  const elapsedMs = lastCountedWorkoutAt == null ? Infinity : now - lastCountedWorkoutAt;
  const hoursSinceWorkout = elapsedMs / hourMs;
  const graceMs = graceHours * hourMs;
  const energy = Math.max(0, 100 - (100 * Math.max(0, elapsedMs - graceMs)) / (3 * graceMs));
  const prs = last == null ? {} : History_getPersonalRecords(growth.workouts.map(({ record }) => record))[last.id];
  const personalRecord = Object.values(prs ?? {}).some(
    (pr) => pr?.prevMaxWeightSet != null || pr?.prevMax1RMSet != null
  );
  const mood =
    hoursSinceWorkout <= (personalRecord ? pumpedHoursAfterRecord : pumpedHours)
      ? "pumped"
      : energy < 40
        ? "tired"
        : fullness < 20
          ? "hungry"
          : "normal";
  const line = store.line ?? sources.defaultLine ?? "male";
  return {
    line,
    tierSet,
    level,
    countedKg: growth.countedKg,
    fullness,
    energy,
    mood,
    lastCountedWorkoutAt,
    workouts: growth.workouts,
  };
}
