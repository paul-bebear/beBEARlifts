import { FoodLog_dayKey, FoodLog_shiftDay, IFoodMeal } from "./foodLog";
import { FoodMealForTime_pick } from "./foodMealForTime";

export const LateNightMeal_windowHours = 4;
export const LateNightMeal_question = "Today or last night?";

export interface ILateNightMealTarget {
  label: string;
  day: string;
  meal: IFoodMeal;
}

export interface ILateNightMealTargets {
  question?: string;
  targets: ILateNightMealTarget[];
}

export function LateNightMeal_isLate(now: number): boolean {
  return new Date(now).getHours() < LateNightMeal_windowHours;
}

export function LateNightMeal_targets(now: number, shownDay?: string): ILateNightMealTargets {
  const date = new Date(now);
  const today = FoodLog_dayKey(date);
  const day = shownDay ?? today;
  const logToday: ILateNightMealTarget = { label: "Today", day, meal: FoodMealForTime_pick(date) };
  if (day !== today || !LateNightMeal_isLate(now)) {
    return { targets: [logToday] };
  }
  const lastNight: ILateNightMealTarget = { label: "Last night", day: FoodLog_shiftDay(today, -1), meal: "dinner" };
  return { question: LateNightMeal_question, targets: [lastNight, logToday] };
}
