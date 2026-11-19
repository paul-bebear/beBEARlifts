import {
  FoodLog_addAll,
  FoodLog_dayKey,
  FoodLog_dayLabel,
  FoodLog_entriesFor,
  FoodLog_formatNumber,
  FoodLog_shiftDay,
  IFoodEntry,
  IFoodLog,
  IFoodMeal,
} from "./foodLog";
import { FoodDayPage_meals } from "./foodDayPage";

export interface IFoodRepeatState {
  day: string;
  into: string;
  selected: string[];
  isSaving: boolean;
}

export function FoodRepeat_initial(into: string): IFoodRepeatState {
  return { day: FoodLog_shiftDay(into, -1), into, selected: [], isSaving: false };
}

export function FoodRepeat_showDay(state: IFoodRepeatState, day: string): IFoodRepeatState {
  return { ...state, day, selected: [], isSaving: false };
}

export function FoodRepeat_toggle(state: IFoodRepeatState, id: string): IFoodRepeatState {
  return state.isSaving
    ? state
    : {
        ...state,
        selected: state.selected.includes(id) ? state.selected.filter((item) => item !== id) : [...state.selected, id],
      };
}

export function FoodRepeat_begin(log: IFoodLog, state: IFoodRepeatState): IFoodRepeatState | undefined {
  return state.isSaving || FoodRepeat_selected(log, state).length === 0 ? undefined : { ...state, isSaving: true };
}

export function FoodRepeat_retry(state: IFoodRepeatState): IFoodRepeatState {
  return { ...state, isSaving: false };
}

export function FoodRepeat_groups(log: IFoodLog, day: string): { meal: IFoodMeal; entries: IFoodEntry[] }[] {
  return FoodDayPage_meals(log, day, false);
}

export function FoodRepeat_fallback(log: IFoodLog, today: string): string | undefined {
  for (let offset = 1; offset <= 7; offset += 1) {
    const day = FoodLog_shiftDay(today, -offset);
    if (FoodLog_entriesFor(log, day).length > 0) {
      return offset === 1 ? undefined : day;
    }
  }
  return undefined;
}

export function FoodRepeat_offer(day: string): string {
  const [year, month, date] = day.split("-").map(Number);
  const weekday = new Date(year, month - 1, date, 12).toLocaleDateString("en-US", { weekday: "long" });
  return `Nothing on the day before. Show ${weekday}?`;
}

export function FoodRepeat_heading(state: IFoodRepeatState, now: Date): { title: string; source: string } {
  return { title: "Copy from another day", source: FoodLog_dayLabel(state.day, FoodLog_dayKey(now)) };
}

export function FoodRepeat_details(entry: IFoodEntry): string {
  const amount = entry.grams != null ? `${FoodLog_formatNumber(entry.grams)} g` : "1 serving";
  return `${amount} · ${FoodLog_formatNumber(entry.nutrients.calories)} kcal`;
}

export function FoodRepeat_selected(log: IFoodLog, state: IFoodRepeatState): IFoodEntry[] {
  return FoodLog_entriesFor(log, state.day).filter((entry) => state.selected.includes(entry.id));
}

export function FoodRepeat_copy(
  log: IFoodLog,
  state: IFoodRepeatState,
  now: number,
  newId: () => string,
  meal?: IFoodMeal
): IFoodLog {
  const day = state.into;
  const copies = FoodRepeat_selected(log, state).map((entry) => ({
    ...entry,
    id: newId(),
    day,
    meal: meal ?? entry.meal,
    createdAt: now,
    nutrients: { ...entry.nutrients },
    per100g: entry.per100g != null ? { ...entry.per100g } : undefined,
  }));
  return FoodLog_addAll(log, copies);
}
