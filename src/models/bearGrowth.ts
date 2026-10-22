import { IHistoryRecord, ISet, ISettings, IStats, IWeight } from "../types";
import { Exercise_getVolumeMultiplier, Exercise_toKey } from "./exercise";
import { FoodLog_dayKey } from "./foodLog";
import { History_workoutTime } from "./history";
import { Weight_convertTo } from "./weight";

export interface IBearCountedWorkout {
  record: IHistoryRecord;
  countedKg: number;
}

export interface IBearGrowth {
  countedKg: number;
  workouts: IBearCountedWorkout[];
}

function positive(value: number): number {
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}

function setKg(set: ISet): number {
  const weight = set.completedWeight ?? set.weight;
  return weight == null ? 0 : positive(Weight_convertTo(weight, "kg").value);
}

function completedReps(set: ISet): number {
  return positive(set.completedReps ?? 0) + positive(set.completedRepsLeft ?? 0);
}

function workoutMinutes(record: IHistoryRecord): number {
  if (
    record.vtype !== "history_record" ||
    !Number.isFinite(record.startTime) ||
    record.endTime == null ||
    !Number.isFinite(record.endTime) ||
    record.endTime <= record.startTime ||
    record.intervals?.some(
      ([start, end]) => !Number.isFinite(start) || end == null || !Number.isFinite(end) || end < start
    )
  ) {
    return 0;
  }
  const activeMs =
    record.endTime === 0 || record.intervals?.some(([, end]) => end === 0)
      ? (record.intervals ?? [[record.startTime, record.endTime]]).reduce(
          (total, [start, end]) => total + end! - start,
          0
        )
      : History_workoutTime(record);
  return positive(Math.min(activeMs, record.endTime - record.startTime) / 60000);
}

function eligible(record: IHistoryRecord): boolean {
  return workoutMinutes(record) >= 10 && record.entries.some((entry) => entry.sets.some((set) => set.isCompleted));
}

function day(record: IHistoryRecord): string {
  return FoodLog_dayKey(new Date(record.endTime!));
}

function addBestWeights(best: Map<string, number>, record: IHistoryRecord): void {
  for (const entry of record.entries) {
    const key = Exercise_toKey(entry.exercise);
    for (const set of entry.sets) {
      if (set.isCompleted && completedReps(set) > 0) {
        best.set(key, Math.max(best.get(key) ?? 0, setKg(set)));
      }
    }
  }
}

function bestWeights(records: readonly IHistoryRecord[]): Map<string, number> {
  const best = new Map<string, number>();
  for (const record of records) {
    addBestWeights(best, record);
  }
  return best;
}

export function BearGrowth_countedKg(
  record: IHistoryRecord,
  earlierCounted: readonly IHistoryRecord[],
  settings: ISettings,
  bodyweight?: IWeight
): number {
  const earlier = earlierCounted.filter((previous) => previous.endTime! <= record.startTime && eligible(previous));
  if (!eligible(record) || earlier.some((previous) => day(previous) === day(record))) {
    return 0;
  }
  return volumeKg(record, bestWeights(earlier), settings, bodyweight);
}

function volumeKg(
  record: IHistoryRecord,
  best: Map<string, number>,
  settings: ISettings,
  bodyweight?: IWeight
): number {
  const bodyKg = bodyweight == null ? 0 : positive(Weight_convertTo(bodyweight, "kg").value);
  let volume = 0;
  for (const entry of record.entries) {
    const previousBest = best.get(Exercise_toKey(entry.exercise));
    const cap = previousBest == null ? (bodyKg > 0 ? 2 * bodyKg : 120) : 1.3 * previousBest;
    const multiplier = positive(Exercise_getVolumeMultiplier(entry.exercise, settings));
    for (const set of entry.sets) {
      if (set.isCompleted) {
        const kg = setKg(set);
        const countedWeight = kg === 0 ? 0.6 * bodyKg : Math.min(kg, cap);
        volume += countedWeight * completedReps(set) * (kg === 0 ? 1 : multiplier);
      }
    }
  }
  return Math.min(volume, workoutMinutes(record) * 200, 25000);
}

export function BearGrowth_history(
  history: readonly IHistoryRecord[],
  settings: ISettings,
  stats?: IStats
): IBearGrowth {
  const ordered = [...history].filter(eligible).sort((a, b) => a.endTime! - b.endTime! || a.id - b.id);
  const weights = (stats?.weight.weight ?? [])
    .filter((stat) => stat.value.value > 0 && Number.isFinite(stat.value.value))
    .sort((a, b) => a.timestamp - b.timestamp);
  const workouts: IBearCountedWorkout[] = [];
  const earlier: IHistoryRecord[] = [];
  const days = new Set<string>();
  const best = new Map<string, number>();
  let merged = 0;
  let countedKg = 0;
  for (const record of ordered) {
    const key = day(record);
    if (days.has(key)) {
      continue;
    }
    let low = 0;
    let high = weights.length;
    while (low < high) {
      const mid = Math.floor((low + high) / 2);
      if (weights[mid].timestamp <= record.startTime) {
        low = mid + 1;
      } else {
        high = mid;
      }
    }
    const bodyweight = weights[low - 1]?.value;
    while (merged < earlier.length && earlier[merged].endTime! <= record.startTime) {
      addBestWeights(best, earlier[merged]);
      merged += 1;
    }
    const overlapsMerged = merged > 0 && earlier[merged - 1].endTime! > record.startTime;
    const kg = overlapsMerged
      ? BearGrowth_countedKg(record, earlier, settings, bodyweight)
      : volumeKg(record, best, settings, bodyweight);
    workouts.push({ record, countedKg: kg });
    earlier.push(record);
    days.add(key);
    countedKg += kg;
  }
  return { countedKg, workouts };
}
