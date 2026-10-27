import { IBearState } from "./bear";
import { IBearCountedWorkout } from "./bearGrowth";
import { BearHoney_dailyMax, IHoneyDay } from "./bearHoney";
import { FoodLog_dayKey } from "./foodLog";
import { BearComparison_for } from "./bearComparison";
import { BearTier_all, IBearTierProgress, IBearTierSet } from "./bearTier";
import { IHistoryRecord } from "../types";

const dayMs = 86400000;
const weekdays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function BearText_kg(kg: number): string {
  return `${Math.round(Math.max(0, kg)).toLocaleString("en-US")} kg`;
}

export function BearText_levelTitle(progress: IBearTierProgress): string {
  return `Level ${progress.tier.level} · ${progress.tier.name}`;
}

export function BearText_levelLine(progress: IBearTierProgress): string {
  if (progress.next == null) {
    const top = BearComparison_for(progress.tier.minKg);
    return top != null ? `Top level · ${top}` : "Top level";
  }
  const left = `${BearText_kg(progress.kgToNext)} to ${progress.next.name}`;
  const comparison = BearComparison_for(progress.next.minKg);
  return comparison != null ? `${left} · ${comparison}` : left;
}

function since(time: number, now: number): string {
  const date = new Date(time);
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  if (time >= startOfToday.getTime() - dayMs) {
    return time >= startOfToday.getTime() ? "today" : "yesterday";
  }
  if (time >= startOfToday.getTime() - 6 * dayMs) {
    return weekdays[date.getDay()];
  }
  return `${date.getDate()} ${months[date.getMonth()]}`;
}

export function BearText_status(state: IBearState, now: number): string {
  switch (state.mood) {
    case "pumped":
      return "Pumped after training";
    case "tired":
      return state.lastCountedWorkoutAt == null
        ? "Your bear is waiting for its first workout"
        : `Your bear hasn't moved since ${since(state.lastCountedWorkoutAt, now)}`;
    case "hungry":
      return "Your bear is hungry. Log a meal";
    default:
      return "Fed and rested";
  }
}

export function BearText_honeyLine(balance: number): string {
  return `🍯 ${Math.max(0, Math.round(balance)).toLocaleString("en-US")} honey`;
}

export function BearText_honeyBreakdown(day: IHoneyDay | undefined): string {
  if (day == null || day.items.length === 0) {
    return "Nothing earned yet today";
  }
  const parts = day.items.map((item) => `${item.label} +${item.amount}`);
  return day.isCapped ? [...parts, `Daily max ${BearHoney_dailyMax}`].join(" · ") : parts.join(" · ");
}

export function BearText_honeySaved(total: number): string {
  return `Your bear saved ${Math.max(0, Math.round(total)).toLocaleString("en-US")} honey for you.`;
}

export function BearText_lockLine(atDays: number, toGo: number): string {
  return `Opens at ${atDays} active ${atDays === 1 ? "day" : "days"} · ${toGo} to go`;
}

export const BearText_houseEmpty = {
  tv: "No friends yet",
  passport: "Stamp your first city",
  scale: "Weigh in",
  passportSoon: "City stamps come soon",
} as const;

export function BearText_finishLine(
  record: IHistoryRecord,
  workouts: readonly IBearCountedWorkout[],
  progress: IBearTierProgress
): string {
  const counted = workouts.find((workout) => workout.record.id === record.id);
  if (counted == null) {
    const day = record.endTime == null ? undefined : FoodLog_dayKey(new Date(record.endTime));
    const sameDay = workouts.some(
      (w) => w.record.endTime != null && FoodLog_dayKey(new Date(w.record.endTime)) === day
    );
    return sameDay ? "+0 kg · one workout a day grows your bear" : "+0 kg · train 10 minutes or more to grow your bear";
  }
  const next = progress.next == null ? "Top level" : `${progress.next.name} in ${BearText_kg(progress.kgToNext)}`;
  return `+${BearText_kg(counted.countedKg)} · ${next}`;
}

const levelMilestones: Record<number, string> = {
  2: "Your first pump.",
  3: "Ten days in. Every lift has your own number now.",
  4: "Week 3. The bar starts to feel lighter.",
  5: "Six weeks in. This is when the mirror starts to agree.",
  6: "Three months. Friends notice before you do.",
  7: "Six months. Time for a bigger shirt.",
  8: "Nine months. Most of your lifts have doubled.",
  9: "One year. The beginner year is done.",
  10: "Year two. Half as much again, and it shows.",
  11: "Year three. A lifter, not a beginner.",
  12: "Year four. You lifted your way to Mars.",
};

export function BearText_levelUp(
  level: number,
  set: IBearTierSet
): { title: string; subtitle: string; milestone?: string } {
  const tiers = BearTier_all(set);
  const tier = tiers.find((t) => t.level === level) ?? tiers[0];
  const comparison = BearComparison_for(tier.minKg);
  return {
    title: `Level ${tier.level} · ${tier.name}`,
    subtitle: comparison != null ? `Your bear grew! You have lifted ${comparison} so far.` : "Your bear grew!",
    milestone: levelMilestones[tier.level],
  };
}
