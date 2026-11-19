import {
  FoodLog_dayKey,
  FoodLog_dayLabel,
  FoodLog_entriesFor,
  FoodLog_meals,
  FoodLog_shiftDay,
  IFoodEntry,
  IFoodLog,
  IFoodMeal,
  INutrients,
} from "./foodLog";
import { FoodMicroTotals_forDay, IMicroTotals } from "./foodMicroTotals";

export interface IFoodDayMeal {
  meal: IFoodMeal;
  entries: IFoodEntry[];
}

export interface IFoodDayPage {
  day: string;
  label: string;
  previousDay: string;
  nextDay: string;
  micros: IMicroTotals;
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
    previousDay: FoodLog_shiftDay(day, -1),
    nextDay: FoodLog_shiftDay(day, 1),
    micros: FoodMicroTotals_forDay(log, day, today),
  };
}

export interface IRecipePhotoState {
  src?: string;
  isError: boolean;
}

export function RecipePhoto_initial(
  remote: string | undefined,
  initialUri: (url: string) => string
): IRecipePhotoState {
  return { src: remote ? initialUri(remote) : undefined, isError: false };
}

export function RecipePhoto_showsPlaceholder(state: IRecipePhotoState, remote: string | undefined): boolean {
  return remote == null || state.src == null || state.isError;
}

export function RecipePhoto_shouldDownload(state: IRecipePhotoState, remote: string): boolean {
  return state.src === remote;
}

export function RecipePhoto_failed(
  state: IRecipePhotoState,
  remote: string
): { state: IRecipePhotoState; marksMissing: boolean } {
  return state.src !== remote
    ? { state: { src: remote, isError: false }, marksMissing: true }
    : { state: { ...state, isError: true }, marksMissing: false };
}

export function FoodDayPage_pillText(totals: INutrients): string {
  return `🔥 ${Math.round(totals.calories).toLocaleString("en-US")} · C ${Math.round(totals.carbs)} · P ${Math.round(totals.protein)} · F ${Math.round(totals.fat)}`;
}
