import { IHistoryRecord, IStats } from "../types";
import { IBearCountedWorkout } from "./bearGrowth";
import { DailyChecklist_doneDays } from "./dailyChecklist";
import type { IFeedState } from "./feed";
import { FoodLog_dayKey, FoodLog_dayTotals, FoodLog_entriesFor, FoodLog_shiftDay, IFoodLog } from "./foodLog";

export type IHoneyReason = "workout" | "weighIn" | "protein" | "carbs" | "fat" | "shared" | "streak";

export interface IHoneyItem {
  reason: IHoneyReason;
  label: string;
  amount: number;
}

export interface IHoneyDay {
  day: string;
  items: IHoneyItem[];
  isCapped: boolean;
  total: number;
}

export interface IHoneySources {
  workouts: readonly IBearCountedWorkout[];
  stats: IStats;
  foodLog: IFoodLog;
  // postedAt of the user's own workout and meal posts
  sharedAt: readonly number[];
}

export interface IHoneyEarned {
  total: number;
  days: IHoneyDay[];
}

const BearHoney_workout = 5;
export const BearHoney_dailyMax = 10;
const BearHoney_streakWeek = 7;
const BearHoney_streakBonus = 5;

const macros = ["protein", "carbs", "fat"] as const;
const macroLabels = { protein: "Protein", carbs: "Carbs", fat: "Fat" };

function dayOf(timestamp: number): string {
  return FoodLog_dayKey(new Date(timestamp));
}

function macroItems(foodLog: IFoodLog, day: string): IHoneyItem[] {
  if (FoodLog_entriesFor(foodLog, day).length === 0) {
    return [];
  }
  const totals = FoodLog_dayTotals(foodLog, day);
  return macros
    .filter((key) => {
      const range = foodLog.goals[key];
      return range.max > 0 && totals[key] >= range.min && totals[key] <= range.max;
    })
    .map((key) => ({ reason: key, label: macroLabels[key], amount: 1 }));
}

function streakDays(doneDays: ReadonlySet<string>): Set<string> {
  const bonusDays = new Set<string>();
  const sorted = [...doneDays].sort();
  let runLength = 0;
  let previous: string | undefined;
  for (const day of sorted) {
    runLength = previous != null && FoodLog_shiftDay(previous, 1) === day ? runLength + 1 : 1;
    if (runLength % BearHoney_streakWeek === 0) {
      bonusDays.add(day);
    }
    previous = day;
  }
  return bonusDays;
}

function countByDay(timestamps: readonly number[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const timestamp of timestamps) {
    const day = dayOf(timestamp);
    counts.set(day, (counts.get(day) ?? 0) + 1);
  }
  return counts;
}

function buildDay(
  day: string,
  hasWorkout: boolean,
  hasWeighIn: boolean,
  shares: number,
  foodLog: IFoodLog,
  hasStreakBonus: boolean
): IHoneyDay {
  const items: IHoneyItem[] = [];
  if (hasWorkout) {
    items.push({ reason: "workout", label: "Workout", amount: BearHoney_workout });
  }
  if (hasWeighIn) {
    items.push({ reason: "weighIn", label: "Weigh-in", amount: 1 });
  }
  items.push(...macroItems(foodLog, day));
  if (shares > 0) {
    items.push({ reason: "shared", label: "Shared", amount: shares });
  }
  const base = items.reduce((sum, item) => sum + item.amount, 0);
  if (hasStreakBonus) {
    items.push({ reason: "streak", label: "7-day streak", amount: BearHoney_streakBonus });
  }
  const streak = hasStreakBonus ? BearHoney_streakBonus : 0;
  return { day, items, isCapped: base > BearHoney_dailyMax, total: Math.min(base, BearHoney_dailyMax) + streak };
}

export function BearHoney_earned(sources: IHoneySources, now: number): IHoneyEarned {
  const today = dayOf(now);
  const workoutDays = new Set(sources.workouts.map(({ record }) => dayOf(record.endTime ?? record.startTime)));
  const weighInDays = new Set((sources.stats.weight.weight ?? []).map((entry) => dayOf(entry.timestamp)));
  const shareCounts = countByDay(sources.sharedAt);
  const bonusDays = streakDays(DailyChecklist_doneDays({ foodLog: sources.foodLog, workouts: sources.workouts }));
  const allDays = new Set<string>([...workoutDays, ...weighInDays, ...shareCounts.keys(), ...bonusDays]);
  for (const entry of sources.foodLog.entries) {
    allDays.add(entry.day);
  }
  const days = [...allDays]
    .filter((day) => day <= today)
    .sort()
    .map((day) =>
      buildDay(
        day,
        workoutDays.has(day),
        weighInDays.has(day),
        shareCounts.get(day) ?? 0,
        sources.foodLog,
        bonusDays.has(day)
      )
    )
    .filter((day) => day.total > 0);
  return { total: days.reduce((sum, day) => sum + day.total, 0), days };
}

// The feed cache holds friends' posts too, so only rows by the cache owner count.
export function BearHoney_sharedAt(feed: IFeedState): number[] {
  if (feed.userId == null) {
    return [];
  }
  const mine = <T extends { userId: string; postedAt: number }>(posts: T[]): number[] =>
    posts.filter((post) => post.userId === feed.userId).map((post) => post.postedAt);
  return [...mine(feed.posts), ...mine(feed.meals)];
}

export function BearHoney_day(earned: IHoneyEarned, day: string): IHoneyDay | undefined {
  return earned.days.find((d) => d.day === day);
}

export function BearHoney_balance(earned: number, spent: number): number {
  return Math.max(0, Math.floor(earned) - Math.max(0, Math.floor(spent)));
}

// Honey this workout added to its own day: the day's total with the workout minus the total without it.
export function BearHoney_forWorkout(record: IHistoryRecord, sources: IHoneySources): number {
  if (!sources.workouts.some((w) => w.record.id === record.id)) {
    return 0;
  }
  const day = dayOf(record.endTime ?? record.startTime);
  const endOfDay = new Date(`${day}T23:59:59`).getTime();
  const total = (s: IHoneySources): number => BearHoney_day(BearHoney_earned(s, endOfDay), day)?.total ?? 0;
  const without = { ...sources, workouts: sources.workouts.filter((w) => w.record.id !== record.id) };
  return total(sources) - total(without);
}
