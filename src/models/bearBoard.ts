import { IHistoryRecord, IStats, IUnit } from "../types";
import { IBearCountedWorkout } from "./bearGrowth";
import { BearText_kg } from "./bearText";
import { IBearTierProgress } from "./bearTier";
import {
  DailyChecklist_build,
  DailyChecklist_goalTarget,
  DailyChecklist_streakOf,
  DailyChecklist_weighInDayName,
  IChecklistItem,
} from "./dailyChecklist";
import { FoodLog_dayKey, FoodLog_dayTotals, IFoodLog } from "./foodLog";
import { MonthCalendar_workoutDays } from "./monthCalendar";
import { NumberText_round1 } from "./numberText";
import { IProgramGoal, ProgramGoal_formatWeight, ProgramGoal_kindLabel } from "./programGoal";
import { TodayPill_text } from "./todayPill";
import { StatsLatest_bodyWeightIn, StatsLatest_entries, StatsLatest_entry } from "./statsLatest";
import { DayNames_monthDayYearIfOtherYear } from "./dayNames";
import { StringUtils_pluralize } from "../utils/string";

export type IBearBoardTarget = "plus" | "goal" | "bear" | "streak";

export interface IBearBoardLine {
  id: "train" | "food" | "weighIn" | "streak" | "goal" | "goalSince" | "weight" | "level" | "lifted";
  text: string;
  isDone: boolean;
  target: IBearBoardTarget;
}

export interface IBearBoardInput {
  history: readonly IHistoryRecord[];
  stats: IStats;
  foodLog: IFoodLog;
  units: IUnit;
  dayName?: string;
  goal?: IProgramGoal;
  startWeekFromMonday?: boolean;
  level: IBearTierProgress;
  countedKg: number;
  workouts: readonly IBearCountedWorkout[];
  now: number;
}

const dayMs = 86400000;
const trendDays = 30;
const maxChangeSpanDays = 60;

function oneDecimal(value: number): string {
  return NumberText_round1(value).toFixed(1);
}

function formatCount(value: number): string {
  return Math.round(value).toLocaleString("en-US");
}

function todo(id: IBearBoardLine["id"], text: string, item: IChecklistItem): IBearBoardLine {
  return { id, text, isDone: item.isDone, target: "plus" };
}

function trainText(input: IBearBoardInput): string {
  const pill = TodayPill_text({ dayName: input.dayName, history: [...input.history], now: input.now });
  return pill.replace(/!$/, "");
}

function foodText(input: IBearBoardInput, today: string): string {
  const eaten = formatCount(FoodLog_dayTotals(input.foodLog, today).calories);
  const target = DailyChecklist_goalTarget(input.foodLog.goals.calories);
  return target > 0 ? `${eaten} of ${formatCount(target)} cal` : `${eaten} cal`;
}

export function BearBoard_latestWeight(stats: IStats, units: IUnit, now: number): string | undefined {
  const latest = StatsLatest_entry(stats.weight.weight, now);
  return latest == null ? undefined : oneDecimal(StatsLatest_bodyWeightIn(latest.value, units));
}

function streakLine(input: IBearBoardInput, today: string): IBearBoardLine {
  const days = DailyChecklist_streakOf({ workouts: input.workouts, foodLog: input.foodLog }, today);
  return {
    id: "streak",
    text: `Streak · ${days} ${StringUtils_pluralize("day", days)}`,
    isDone: false,
    target: "streak",
  };
}

function weightLine(input: IBearBoardInput): IBearBoardLine {
  const entries = StatsLatest_entries(input.stats.weight.weight, input.now);
  const latest = entries[entries.length - 1];
  if (latest == null) {
    return { id: "weight", text: "Weight · not logged yet", isDone: false, target: "bear" };
  }
  const inUnits = (e: (typeof entries)[number]): number => StatsLatest_bodyWeightIn(e.value, input.units);
  const windowStart = input.now - trendDays * dayMs;
  const oldBase = [...entries].reverse().find((e) => e.timestamp <= windowStart) ?? entries[0];
  const oldSpan = Math.round((latest.timestamp - oldBase.timestamp) / dayMs);
  const base = oldSpan > maxChangeSpanDays ? (entries.find((e) => e.timestamp > windowStart) ?? latest) : oldBase;
  const value = `${oneDecimal(inUnits(latest))} ${input.units}`;
  if (base === latest) {
    return { id: "weight", text: value, isDone: false, target: "bear" };
  }
  const spanDays = Math.max(1, Math.round((latest.timestamp - base.timestamp) / dayMs));
  const change = inUnits(latest) - inUnits(base);
  const sign = change > 0 ? "+" : change < 0 ? "−" : "±";
  return {
    id: "weight",
    text: `${value} · ${sign}${oneDecimal(Math.abs(change))} in ${spanDays} d`,
    isDone: false,
    target: "bear",
  };
}

function levelText(level: IBearTierProgress): string {
  const head = `Level ${level.tier.level}`;
  return level.next == null ? `${head} · top level` : `${head} · ${BearText_kg(level.kgToNext)} to go`;
}

export function BearBoard_goalLines(goal: IProgramGoal | undefined, units: IUnit, now: number): IBearBoardLine[] {
  if (goal == null) {
    return [{ id: "goal", text: "Goal: tap to set one", isDone: false, target: "goal" }];
  }
  const since = DayNames_monthDayYearIfOtherYear(goal.startedAt, now);
  const text = goal.startWeight == null ? since : `${since} · ${ProgramGoal_formatWeight(goal.startWeight, units)}`;
  return [
    { id: "goal", text: `Goal: ${ProgramGoal_kindLabel(goal.kind).toLowerCase()}`, isDone: false, target: "goal" },
    { id: "goalSince", text: `Since ${text}`, isDone: false, target: "goal" },
  ];
}

export function BearBoard_lines(input: IBearBoardInput): IBearBoardLine[] {
  const today = FoodLog_dayKey(new Date(input.now));
  const checklist = DailyChecklist_build({
    day: today,
    today,
    stats: input.stats,
    foodLog: input.foodLog,
    units: input.units,
    workoutDays: MonthCalendar_workoutDays([...input.history]),
    goalStartedAt: input.goal?.startedAt,
    startWeekFromMonday: input.startWeekFromMonday,
  });
  const item = (key: IChecklistItem["key"]): IChecklistItem => checklist.items.find((i) => i.key === key)!;
  return [
    todo("train", trainText(input), item("train")),
    todo("food", foodText(input, today), item("food")),
    todo(
      "weighIn",
      `Weight: ${DailyChecklist_weighInDayName(input.goal?.startedAt, input.startWeekFromMonday)}`,
      item("weight")
    ),
    streakLine(input, today),
    ...BearBoard_goalLines(input.goal, input.units, input.now),
    weightLine(input),
    { id: "level", text: levelText(input.level), isDone: false, target: "bear" },
    { id: "lifted", text: `Lifted ${BearText_kg(input.countedKg)}`, isDone: false, target: "bear" },
  ];
}
