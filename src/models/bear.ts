import { IHistoryRecord, ISettings, IStats } from "../types";
import { IFoodLog } from "./foodLog";
import { BearFullness_hungryBelow, BearFullness_percent } from "./bearFullness";
import { BearGrowth_history, IBearCountedWorkout } from "./bearGrowth";
import { BearStoreData_empty, IBearFur, IBearLine, IBearStoreData } from "./bearStoreData";
import { BearTier_floorKg, BearTier_progress, BearTier_setFor, IBearTierProgress, IBearTierSet } from "./bearTier";
import { History_getPersonalRecords, History_hasBeatenPrevious } from "./history";

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
  fur: IBearFur;
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

export function Bear_state(sources: IBearSources, now: number): IBearState {
  const history = sources.history.filter((record) => record.endTime != null && record.endTime <= now);
  const growth = BearGrowth_history(history, sources.settings, sources.stats);
  const store = sources.bear ?? BearStoreData_empty();
  const tierSet = BearTier_setFor(sources.foodLog.profile.sex, store.line);
  const level = BearTier_progress(BearTier_floorKg(store.celebratedLevel, tierSet), growth.countedKg, tierSet);
  const fullness = BearFullness_percent(sources.foodLog, now);
  const finished = [...growth.workouts.map(({ record }) => record), ...growth.sameDayExtras].sort(
    (a, b) => a.endTime! - b.endTime! || a.id - b.id
  );
  const last = finished.slice(-1)[0];
  const lastCountedWorkoutAt = last?.endTime;
  const plannedDays = sources.plannedDaysPerWeek;
  const graceHours =
    plannedDays != null && Number.isFinite(plannedDays) && plannedDays > 0 ? 168 / Math.min(7, plannedDays) : 168;
  const elapsedMs = lastCountedWorkoutAt == null ? Infinity : now - lastCountedWorkoutAt;
  const hoursSinceWorkout = elapsedMs / hourMs;
  const graceMs = graceHours * hourMs;
  const energy = Math.max(0, 100 - (100 * Math.max(0, elapsedMs - graceMs)) / (3 * graceMs));
  const personalRecord = last != null && History_hasBeatenPrevious(History_getPersonalRecords(finished), last.id);
  const mood =
    hoursSinceWorkout <= (personalRecord ? pumpedHoursAfterRecord : pumpedHours)
      ? "pumped"
      : energy < 40
        ? "tired"
        : fullness < BearFullness_hungryBelow
          ? "hungry"
          : "normal";
  const line = store.line ?? sources.defaultLine ?? "male";
  return {
    line,
    fur: store.fur ?? "brown",
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
