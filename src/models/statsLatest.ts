import type { IUnit, IWeight } from "../types";
import { NumberText_round1 } from "./numberText";

// Same factor as programGoal.ts. Importing programGoal here has broken module load order before.
const kgPerLb = 0.45359237;

interface IStatsEntry {
  timestamp: number;
  value: { value: number };
}

function nextLocalMidnight(now: number): number {
  const date = new Date(now);
  date.setHours(24, 0, 0, 0);
  return date.getTime();
}

function readableBefore<T extends IStatsEntry>(values: readonly T[] | undefined, limit: number): T[] {
  return (values ?? [])
    .filter((e) => e.timestamp < limit && Number.isFinite(e.value.value) && e.value.value > 0)
    .sort((a, b) => a.timestamp - b.timestamp);
}

// The cutoff is the end of today, not now. A scale, a watch or a restored backup can stamp a few seconds ahead.
export function StatsLatest_entries<T extends IStatsEntry>(values: readonly T[] | undefined, now: number): T[] {
  return readableBefore(values, nextLocalMidnight(now));
}

export function StatsLatest_entry<T extends IStatsEntry>(values: readonly T[] | undefined, now: number): T | undefined {
  const entries = StatsLatest_entries(values, now);
  return entries[entries.length - 1];
}

export function StatsLatest_newest<T extends IStatsEntry>(values: readonly T[] | undefined): T | undefined {
  const entries = readableBefore(values, Number.POSITIVE_INFINITY);
  return entries[entries.length - 1];
}

// Weight_convertTo rounds to 0.5 for barbell plates. Body weight keeps the one decimal the user typed.
export function StatsLatest_bodyWeightIn(weight: IWeight, units: IUnit): number {
  if (weight.unit === units) {
    return NumberText_round1(weight.value);
  }
  return NumberText_round1(units === "kg" ? weight.value * kgPerLb : weight.value / kgPerLb);
}
