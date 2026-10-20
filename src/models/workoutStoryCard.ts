import { IHistoryRecord, IScreenMuscle, ISettings, IWeight } from "../types";
import { History_totalRecordSets, History_totalRecordWeight, History_workoutTime } from "./history";
import { Exercise_synergistMusclesGroups, Exercise_targetMusclesGroups } from "./exercise";
import { Weight_convertTo } from "./weight";

export interface IWorkoutStoryStats {
  weight: IWeight;
  weightKg: number;
  duration: string;
  sets: number;
}

const minuteMs = 60 * 1000;
const synergistShare = 0.5;

export function WorkoutStoryCard_duration(ms: number): string {
  const minutes = Math.max(0, Math.round(ms / minuteMs));
  const hours = Math.floor(minutes / 60);
  return hours > 0 ? `${hours}h ${minutes % 60}m` : `${minutes}m`;
}

export function WorkoutStoryCard_weightNumber(weight: IWeight): string {
  return Math.round(weight.value).toLocaleString("en-US");
}

export function WorkoutStoryCard_stats(record: IHistoryRecord, settings: ISettings): IWorkoutStoryStats {
  const weight = History_totalRecordWeight(record, settings);
  return {
    weight: { ...weight, value: Math.round(weight.value) },
    weightKg: Weight_convertTo(weight, "kg").value,
    duration: WorkoutStoryCard_duration(History_workoutTime(record)),
    sets: History_totalRecordSets(record),
  };
}

// Each finished set counts fully for its target muscles and half for synergists; the busiest muscle is 1.
export function WorkoutStoryCard_muscles(
  record: IHistoryRecord,
  settings: ISettings
): Partial<Record<IScreenMuscle, number>> {
  const points: Partial<Record<IScreenMuscle, number>> = {};
  const add = (muscle: IScreenMuscle, value: number): void => {
    points[muscle] = (points[muscle] ?? 0) + value;
  };
  for (const entry of record.entries) {
    const sets = entry.sets.filter((s) => s.isCompleted).length;
    if (sets === 0) {
      continue;
    }
    for (const muscle of Exercise_targetMusclesGroups(entry.exercise, settings)) {
      add(muscle, sets);
    }
    for (const muscle of Exercise_synergistMusclesGroups(entry.exercise, settings)) {
      add(muscle, sets * synergistShare);
    }
  }
  const max = Math.max(0, ...Object.values(points).map((v) => v ?? 0));
  if (max === 0) {
    return {};
  }
  const normalized: Partial<Record<IScreenMuscle, number>> = {};
  for (const [muscle, value] of Object.entries(points) as [IScreenMuscle, number][]) {
    normalized[muscle] = Math.round((value / max) * 100) / 100;
  }
  return normalized;
}
