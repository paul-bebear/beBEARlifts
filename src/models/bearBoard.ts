import { IHistoryRecord, IStats, IUnit } from "../types";
import { BearText_kg } from "./bearText";
import { IBearTierProgress } from "./bearTier";
import {
  DailyChecklist_build,
  DailyChecklist_goalTarget,
  DailyChecklist_weighInDayName,
  IChecklistItem,
} from "./dailyChecklist";
import { FoodLog_dayKey, FoodLog_dayTotals, IFoodLog } from "./foodLog";
import { MonthCalendar_workoutDays } from "./monthCalendar";
import { TodayPill_text } from "./todayPill";
import { Weight_convertTo } from "./weight";

export type IBearBoardTarget = "plus" | "bear";

export interface IBearBoardLine {
  id: "train" | "food" | "weighIn" | "weight" | "level" | "lifted";
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
  goalStartedAt?: number;
  startWeekFromMonday?: boolean;
  level: IBearTierProgress;
  countedKg: number;
  now: number;
}

const dayMs = 86400000;
const trendDays = 30;

function oneDecimal(value: number): string {
  return (Math.round(value * 10) / 10).toFixed(1);
}

function formatCount(value: number): string {
  return Math.round(value).toLocaleString("en-US");
}

function todo(id: IBearBoardLine["id"], text: string, item: IChecklistItem): IBearBoardLine {
  return { id, text, isDone: item.isDone, target: "plus" };
}

function trainText(input: IBearBoardInput): string {
  const pill = TodayPill_text({ dayName: input.dayName, history: [...input.history], now: input.now });
  return `Train · ${pill.replace(/!$/, "")}`;
}

function foodText(input: IBearBoardInput, today: string): string {
  const eaten = formatCount(FoodLog_dayTotals(input.foodLog, today).calories);
  const target = DailyChecklist_goalTarget(input.foodLog.goals.calories);
  return target > 0 ? `Eat · ${eaten} of ${formatCount(target)} kcal` : `Eat · ${eaten} kcal`;
}

function weightLine(input: IBearBoardInput): IBearBoardLine {
  const entries = (input.stats.weight.weight ?? [])
    .filter((e) => e.timestamp <= input.now && Number.isFinite(e.value.value) && e.value.value > 0)
    .sort((a, b) => a.timestamp - b.timestamp);
  const latest = entries[entries.length - 1];
  if (latest == null) {
    return { id: "weight", text: "Weight · not logged yet", isDone: false, target: "bear" };
  }
  const inUnits = (e: (typeof entries)[number]): number => Weight_convertTo(e.value, input.units).value;
  const windowStart = input.now - trendDays * dayMs;
  const base = [...entries].reverse().find((e) => e.timestamp <= windowStart) ?? entries[0];
  const value = `${oneDecimal(inUnits(latest))} ${input.units}`;
  if (base === latest) {
    return { id: "weight", text: value, isDone: false, target: "bear" };
  }
  const change = inUnits(latest) - inUnits(base);
  const sign = change > 0 ? "+" : change < 0 ? "−" : "±";
  return {
    id: "weight",
    text: `${value} · ${sign}${oneDecimal(Math.abs(change))} in ${trendDays} d`,
    isDone: false,
    target: "bear",
  };
}

function levelText(level: IBearTierProgress): string {
  const head = `Level ${level.tier.level}`;
  return level.next == null ? `${head} · top level` : `${head} · ${BearText_kg(level.kgToNext)} to ${level.next.name}`;
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
    goalStartedAt: input.goalStartedAt,
    startWeekFromMonday: input.startWeekFromMonday,
  });
  const item = (key: IChecklistItem["key"]): IChecklistItem => checklist.items.find((i) => i.key === key)!;
  return [
    todo("train", trainText(input), item("train")),
    todo("food", foodText(input, today), item("food")),
    todo(
      "weighIn",
      `Weigh-in · ${DailyChecklist_weighInDayName(input.goalStartedAt, input.startWeekFromMonday)}`,
      item("weight")
    ),
    weightLine(input),
    { id: "level", text: levelText(input.level), isDone: false, target: "bear" },
    { id: "lifted", text: `Lifted ${BearText_kg(input.countedKg)} since day one`, isDone: false, target: "bear" },
  ];
}
