import { IBearState } from "./bear";
import { IBearCountedWorkout } from "./bearGrowth";
import { FoodLog_dayKey } from "./foodLog";
import { BearTier_all, IBearTierProgress } from "./bearTier";
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
    return progress.tier.comparison != null ? `Top level · ${progress.tier.comparison}` : "Top level";
  }
  const left = `${BearText_kg(progress.kgToNext)} to ${progress.next.name}`;
  return progress.next.comparison != null ? `${left} · ${progress.next.comparison}` : left;
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

export function BearText_levelUp(level: number): { title: string; subtitle: string } {
  const tier = BearTier_all().find((t) => t.level === level) ?? BearTier_all()[0];
  return {
    title: `Level ${tier.level} · ${tier.name}`,
    subtitle:
      tier.comparison != null ? `Your bear grew! You have lifted ${tier.comparison} so far.` : "Your bear grew!",
  };
}
