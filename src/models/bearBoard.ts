import { IHistoryRecord, IStats, IUnit } from "../types";
import { IBearCountedWorkout } from "./bearGrowth";
import { BearText_kg } from "./bearText";
import { CheckInTrend_build } from "./checkInTrend";
import { FeatureLayer_isFront, IFeature } from "./featureLayer";
import { FoodLog_dayKey, FoodLog_dayTotals, IFoodLog } from "./foodLog";
import { INotesLog } from "./notes";
import { Weight_convertTo } from "./weight";

export type IBearBoardTarget = "streak" | "stats" | "reportsHub" | "journal";

export interface IBearBoardTile {
  id: "week" | "weight" | "food" | "perWorkout" | "energy";
  value: string;
  label: string;
  target: IBearBoardTarget;
}

export interface IBearBoardInput {
  history: readonly IHistoryRecord[];
  workouts: readonly IBearCountedWorkout[];
  stats: IStats;
  notes: INotesLog;
  foodLog: IFoodLog;
  units: IUnit;
  plannedPerWeek: number;
  weekStart: number;
  now: number;
}

const dayMs = 86400000;
const trendDays = 30;
const energyDays = 7;

function oneDecimal(value: number): string {
  return (Math.round(value * 10) / 10).toFixed(1);
}

function weekTile(input: IBearBoardInput): IBearBoardTile {
  const done = input.history.filter(
    (record) => record.endTime != null && record.endTime >= input.weekStart && record.endTime <= input.now
  ).length;
  return { id: "week", value: `${done} of ${input.plannedPerWeek}`, label: "workouts this week", target: "streak" };
}

function weightTile(input: IBearBoardInput): IBearBoardTile {
  const entries = (input.stats.weight.weight ?? [])
    .filter((e) => e.timestamp <= input.now && Number.isFinite(e.value.value) && e.value.value > 0)
    .sort((a, b) => a.timestamp - b.timestamp);
  const latest = entries[entries.length - 1];
  if (latest == null) {
    return { id: "weight", value: "–", label: "log your weight", target: "stats" };
  }
  const inUnits = (e: (typeof entries)[number]): number => Weight_convertTo(e.value, input.units).value;
  const windowStart = input.now - trendDays * dayMs;
  const base = [...entries].reverse().find((e) => e.timestamp <= windowStart) ?? entries[0];
  const value = `${oneDecimal(inUnits(latest))} ${input.units}`;
  if (base === latest) {
    return { id: "weight", value, label: "weight", target: "stats" };
  }
  const change = inUnits(latest) - inUnits(base);
  const sign = change > 0 ? "+" : change < 0 ? "−" : "±";
  return {
    id: "weight",
    value,
    label: `weight · ${sign}${oneDecimal(Math.abs(change))} in ${trendDays} d`,
    target: "stats",
  };
}

function perWorkoutTile(input: IBearBoardInput): IBearBoardTile {
  const windowStart = input.now - trendDays * dayMs;
  const recent = input.workouts.filter(
    (w) =>
      w.countedKg > 0 && w.record.endTime != null && w.record.endTime >= windowStart && w.record.endTime <= input.now
  );
  const value =
    recent.length === 0 ? "–" : BearText_kg(recent.reduce((sum, w) => sum + w.countedKg, 0) / recent.length);
  return { id: "perWorkout", value, label: "per workout, 30 d", target: "reportsHub" };
}

function energyTile(input: IBearBoardInput): IBearBoardTile {
  const trend = CheckInTrend_build({
    notes: input.notes,
    today: FoodLog_dayKey(new Date(input.now)),
    length: energyDays,
    workoutDays: new Set(),
  });
  const average = trend.lines.find((line) => line.field === "energy")?.average;
  return average == null
    ? { id: "energy", value: "–", label: "check in today", target: "journal" }
    : { id: "energy", value: `${oneDecimal(average)} / 5`, label: "energy, 7 d", target: "journal" };
}

function formatCount(value: number): string {
  return Math.round(value).toLocaleString("en-US");
}

function proteinLabel(eaten: number, target: number): string {
  return `${formatCount(eaten)} of ${formatCount(target)} g protein today`;
}

function foodTile(input: IBearBoardInput): IBearBoardTile {
  const { goals } = input.foodLog;
  const totals = FoodLog_dayTotals(input.foodLog, FoodLog_dayKey(new Date(input.now)));
  const eaten = formatCount(totals.calories);
  const hasProteinTarget = goals.protein.max > 0;
  if (goals.calories.max <= 0) {
    return hasProteinTarget
      ? {
          id: "food",
          value: `${eaten} kcal`,
          label: proteinLabel(totals.protein, goals.protein.max),
          target: "journal",
        }
      : { id: "food", value: eaten, label: "kcal today", target: "journal" };
  }
  return {
    id: "food",
    value: `${eaten} / ${formatCount(goals.calories.max)} kcal`,
    label: hasProteinTarget ? proteinLabel(totals.protein, goals.protein.max) : "kcal today",
    target: "journal",
  };
}

const candidates: { feature: IFeature; build: (input: IBearBoardInput) => IBearBoardTile }[] = [
  { feature: "workout", build: weekTile },
  { feature: "weight", build: weightTile },
  { feature: "food", build: foodTile },
  { feature: "volume", build: perWorkoutTile },
  { feature: "checkIn", build: energyTile },
];

export function BearBoard_tiles(input: IBearBoardInput): IBearBoardTile[] {
  return candidates.filter((c) => FeatureLayer_isFront(c.feature)).map((c) => c.build(input));
}
