import {
  FoodLog_dayKey,
  FoodLog_dayLabel,
  FoodLog_dayTotals,
  FoodLog_entriesFor,
  FoodLog_meals,
  FoodLog_shiftDay,
  IFoodEntry,
  IFoodLog,
  IFoodMeal,
  INutrients,
} from "./foodLog";
import { FoodMealForTime_pick } from "./foodMealForTime";

export interface IFoodDayMeal {
  meal: IFoodMeal;
  entries: IFoodEntry[];
}

export interface IFoodDayPage {
  day: string;
  label: string;
  isToday: boolean;
  previousDay: string;
  nextDay: string;
  totals: INutrients;
  meals: IFoodDayMeal[];
  logMeal: IFoodMeal;
}

export function FoodDayPage_meals(log: IFoodLog, day: string, includesEmpty: boolean): IFoodDayMeal[] {
  return FoodLog_meals.map((meal) => ({ meal, entries: FoodLog_entriesFor(log, day, meal) })).filter(
    (m) => includesEmpty || m.entries.length > 0
  );
}

export function FoodDayPage_build(log: IFoodLog, day: string, now: number): IFoodDayPage {
  const nowDate = new Date(now);
  const today = FoodLog_dayKey(nowDate);
  return {
    day,
    label: FoodLog_dayLabel(day, today),
    isToday: day === today,
    previousDay: FoodLog_shiftDay(day, -1),
    nextDay: FoodLog_shiftDay(day, 1),
    totals: FoodLog_dayTotals(log, day),
    meals: FoodDayPage_meals(log, day, true),
    logMeal: FoodMealForTime_pick(nowDate),
  };
}
