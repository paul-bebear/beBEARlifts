import type { IUnit, IWeight } from "../types";
import { NumberText_round1 } from "./numberText";
import { ProgramGoal_weightIn } from "./programGoal";

interface IStatsEntry {
  timestamp: number;
  value: { value: number };
}

export function StatsLatest_entries<T extends IStatsEntry>(values: readonly T[] | undefined, now: number): T[] {
  return (values ?? [])
    .filter((e) => e.timestamp <= now && Number.isFinite(e.value.value) && e.value.value > 0)
    .sort((a, b) => a.timestamp - b.timestamp);
}

export function StatsLatest_entry<T extends IStatsEntry>(values: readonly T[] | undefined, now: number): T | undefined {
  const entries = StatsLatest_entries(values, now);
  return entries[entries.length - 1];
}

export function StatsLatest_newest<T extends IStatsEntry>(values: readonly T[] | undefined): T | undefined {
  return StatsLatest_entry(values, Number.POSITIVE_INFINITY);
}

// Weight_convertTo rounds to 0.5 for barbell plates. Body weight keeps the one decimal the user typed.
export function StatsLatest_bodyWeightIn(weight: IWeight, units: IUnit): number {
  return NumberText_round1(ProgramGoal_weightIn(weight, units));
}
