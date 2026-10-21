import type { IFoodProduct } from "./openFoodFacts";
import { SavedFoods_parse, SavedFoods_save } from "./savedFoods";
import { FoodTargets_defaultProfile, FoodTargets_parseProfile, IFoodProfile } from "./foodTargets";

export type IFoodMeal = "breakfast" | "lunch" | "dinner" | "snacks";

export const FoodLog_meals: IFoodMeal[] = ["breakfast", "lunch", "dinner", "snacks"];

export type IFoodSource = "barcode" | "search" | "photo" | "manual";

export interface INutrients {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface IFoodEntry {
  id: string;
  day: string;
  meal: IFoodMeal;
  name: string;
  brand?: string;
  source: IFoodSource;
  barcode?: string;
  grams?: number;
  per100g?: INutrients;
  nutrients: INutrients;
  createdAt: number;
}

export interface IFoodRange {
  min: number;
  max: number;
}

export interface IFoodGoals {
  calories: IFoodRange;
  protein: IFoodRange;
  carbs: IFoodRange;
  fat: IFoodRange;
}

export type IFoodRecent = Omit<IFoodEntry, "id" | "day" | "meal" | "createdAt">;

export interface IFoodSavedMeal {
  id: string;
  name: string;
  items: IFoodRecent[];
}

export interface IFoodRecipe {
  id: string;
  name: string;
  servings: number;
  ingredients: IFoodRecent[];
}

export interface IFoodLog {
  version: 1;
  entries: IFoodEntry[];
  goals: IFoodGoals;
  recents: IFoodRecent[];
  savedFoods: IFoodProduct[];
  meals: IFoodSavedMeal[];
  recipes: IFoodRecipe[];
  profile: IFoodProfile;
}

export type IFoodProgressMode = "consumed" | "remaining";

const maxRecents = 30;

export const FoodLog_defaultGoals: IFoodGoals = {
  calories: { min: 0, max: 0 },
  protein: { min: 0, max: 0 },
  carbs: { min: 0, max: 0 },
  fat: { min: 0, max: 0 },
};

export function FoodLog_hasGoals(goals: IFoodGoals): boolean {
  return Object.values(goals).some((range) => range.max > 0);
}

export const FoodLog_mealNames: Record<IFoodMeal, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snacks: "Snacks",
};

const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const weekdayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function FoodLog_empty(): IFoodLog {
  return {
    version: 1,
    entries: [],
    goals: FoodLog_defaultGoals,
    recents: [],
    savedFoods: [],
    meals: [],
    recipes: [],
    profile: FoodTargets_defaultProfile,
  };
}

export function FoodLog_zero(): INutrients {
  return { calories: 0, protein: 0, carbs: 0, fat: 0 };
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && isFinite(value);
}

function parseNutrients(raw: unknown): INutrients | undefined {
  if (raw == null || typeof raw !== "object") {
    return undefined;
  }
  const r = raw as Record<string, unknown>;
  if (![r.calories, r.protein, r.carbs, r.fat].every(isFiniteNumber)) {
    return undefined;
  }
  return {
    calories: r.calories as number,
    protein: r.protein as number,
    carbs: r.carbs as number,
    fat: r.fat as number,
  };
}

function parseRange(raw: unknown, fallback: IFoodRange): IFoodRange {
  if (raw == null || typeof raw !== "object") {
    return fallback;
  }
  const r = raw as Record<string, unknown>;
  if (!isFiniteNumber(r.min) || !isFiniteNumber(r.max) || r.min < 0 || r.max < r.min) {
    return fallback;
  }
  return { min: r.min, max: r.max };
}

function parseEntry(raw: unknown): IFoodEntry | undefined {
  if (raw == null || typeof raw !== "object") {
    return undefined;
  }
  const r = raw as Record<string, unknown>;
  const nutrients = parseNutrients(r.nutrients);
  if (
    typeof r.id !== "string" ||
    typeof r.day !== "string" ||
    typeof r.name !== "string" ||
    !FoodLog_meals.includes(r.meal as IFoodMeal) ||
    nutrients == null
  ) {
    return undefined;
  }
  const result: IFoodEntry = {
    id: r.id,
    day: r.day,
    meal: r.meal as IFoodMeal,
    name: r.name,
    source: (["barcode", "search", "photo", "manual"] as IFoodSource[]).includes(r.source as IFoodSource)
      ? (r.source as IFoodSource)
      : "manual",
    nutrients,
    createdAt: isFiniteNumber(r.createdAt) ? r.createdAt : 0,
  };
  const per100g = parseNutrients(r.per100g);
  if (typeof r.brand === "string") {
    result.brand = r.brand;
  }
  if (typeof r.barcode === "string") {
    result.barcode = r.barcode;
  }
  if (isFiniteNumber(r.grams)) {
    result.grams = r.grams;
  }
  if (per100g != null) {
    result.per100g = per100g;
  }
  return result;
}

export function FoodLog_parse(raw: unknown): IFoodLog {
  if (raw == null || typeof raw !== "object") {
    return FoodLog_empty();
  }
  const r = raw as Record<string, unknown>;
  const goals = (r.goals ?? {}) as Record<string, unknown>;
  const entries = Array.isArray(r.entries) ? r.entries.map(parseEntry) : [];
  return {
    version: 1,
    entries: entries.filter((e): e is IFoodEntry => e != null),
    goals: {
      calories: parseRange(goals.calories, FoodLog_defaultGoals.calories),
      protein: parseRange(goals.protein, FoodLog_defaultGoals.protein),
      carbs: parseRange(goals.carbs, FoodLog_defaultGoals.carbs),
      fat: parseRange(goals.fat, FoodLog_defaultGoals.fat),
    },
    recents: parseRecents(r.recents),
    savedFoods: SavedFoods_parse(r.savedFoods),
    meals: parseList(r.meals, parseSavedMeal),
    recipes: parseList(r.recipes, parseRecipe),
    profile: FoodTargets_parseProfile(r.profile),
  };
}

function parseRecents(raw: unknown): IFoodRecent[] {
  return Array.isArray(raw)
    ? raw
        .map((recent) => parseEntry({ ...recent, id: "", day: "", meal: "snacks" }))
        .filter((e): e is IFoodEntry => e != null)
        .map(FoodLog_toRecent)
    : [];
}

function parseList<T>(raw: unknown, parse: (item: Record<string, unknown>) => T | undefined): T[] {
  return Array.isArray(raw)
    ? raw
        .filter((item): item is Record<string, unknown> => item != null && typeof item === "object")
        .map(parse)
        .filter((item): item is T => item != null)
    : [];
}

function parseSavedMeal(r: Record<string, unknown>): IFoodSavedMeal | undefined {
  const items = parseRecents(r.items);
  return typeof r.id === "string" && typeof r.name === "string" && items.length > 0
    ? { id: r.id, name: r.name, items }
    : undefined;
}

function parseRecipe(r: Record<string, unknown>): IFoodRecipe | undefined {
  const ingredients = parseRecents(r.ingredients);
  return typeof r.id === "string" &&
    typeof r.name === "string" &&
    isFiniteNumber(r.servings) &&
    r.servings > 0 &&
    ingredients.length > 0
    ? { id: r.id, name: r.name, servings: r.servings, ingredients }
    : undefined;
}

function pad2(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

export function FoodLog_dayKey(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

function dayToDate(day: string): Date {
  const [year, month, date] = day.split("-").map(Number);
  return new Date(year, month - 1, date, 12);
}

export function FoodLog_shiftDay(day: string, delta: number): string {
  const date = dayToDate(day);
  date.setDate(date.getDate() + delta);
  return FoodLog_dayKey(date);
}

export function FoodLog_dayLabel(day: string, today: string): string {
  const date = dayToDate(day);
  const monthDay = `${monthNames[date.getMonth()]} ${date.getDate()}`;
  if (day === today) {
    return `Today, ${monthDay}`;
  }
  if (day === FoodLog_shiftDay(today, -1)) {
    return `Yesterday, ${monthDay}`;
  }
  if (day === FoodLog_shiftDay(today, 1)) {
    return `Tomorrow, ${monthDay}`;
  }
  return `${weekdayNames[date.getDay()]}, ${monthDay}`;
}

export function FoodLog_mealForHour(hour: number): IFoodMeal {
  if (hour >= 4 && hour < 11) {
    return "breakfast";
  }
  if (hour >= 11 && hour < 16) {
    return "lunch";
  }
  if (hour >= 18 && hour < 23) {
    return "dinner";
  }
  return "snacks";
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

export function FoodLog_scale(per100g: INutrients, grams: number): INutrients {
  const k = grams / 100;
  return {
    calories: Math.round(per100g.calories * k),
    protein: round1(per100g.protein * k),
    carbs: round1(per100g.carbs * k),
    fat: round1(per100g.fat * k),
  };
}

export function FoodLog_sum(items: INutrients[]): INutrients {
  const total = items.reduce(
    (acc, n) => ({
      calories: acc.calories + n.calories,
      protein: acc.protein + n.protein,
      carbs: acc.carbs + n.carbs,
      fat: acc.fat + n.fat,
    }),
    FoodLog_zero()
  );
  return {
    calories: Math.round(total.calories),
    protein: round1(total.protein),
    carbs: round1(total.carbs),
    fat: round1(total.fat),
  };
}

export function FoodLog_entriesFor(log: IFoodLog, day: string, meal?: IFoodMeal): IFoodEntry[] {
  return log.entries.filter((e) => e.day === day && (meal == null || e.meal === meal));
}

export function FoodLog_dayTotals(log: IFoodLog, day: string): INutrients {
  return FoodLog_sum(FoodLog_entriesFor(log, day).map((e) => e.nutrients));
}

export function FoodLog_toRecent(entry: IFoodEntry | IFoodRecent): IFoodRecent {
  const { id: _id, day: _day, meal: _meal, createdAt: _createdAt, ...recent } = entry as IFoodEntry;
  return recent;
}

export function FoodLog_recentKey(recent: IFoodRecent): string {
  return recent.barcode ?? `${recent.name}|${recent.brand ?? ""}`.toLowerCase();
}

export function FoodLog_add(log: IFoodLog, entry: IFoodEntry): IFoodLog {
  const recent = FoodLog_toRecent(entry);
  const key = FoodLog_recentKey(recent);
  const recents = [recent, ...log.recents.filter((r) => FoodLog_recentKey(r) !== key)].slice(0, maxRecents);
  return { ...log, entries: [...log.entries, entry], recents };
}

export function FoodLog_saveFood(log: IFoodLog, product: IFoodProduct): IFoodLog {
  return { ...log, savedFoods: SavedFoods_save(log.savedFoods, product) };
}

export function FoodLog_addAll(log: IFoodLog, entries: IFoodEntry[]): IFoodLog {
  return entries.reduce(FoodLog_add, log);
}

export function FoodLog_saveMeal(log: IFoodLog, meal: IFoodSavedMeal): IFoodLog {
  return { ...log, meals: [meal, ...log.meals.filter((m) => m.id !== meal.id)] };
}

export function FoodLog_removeMeal(log: IFoodLog, id: string): IFoodLog {
  return { ...log, meals: log.meals.filter((m) => m.id !== id) };
}

export function FoodLog_saveRecipe(log: IFoodLog, recipe: IFoodRecipe): IFoodLog {
  return { ...log, recipes: [recipe, ...log.recipes.filter((r) => r.id !== recipe.id)] };
}

export function FoodLog_removeRecipe(log: IFoodLog, id: string): IFoodLog {
  return { ...log, recipes: log.recipes.filter((r) => r.id !== id) };
}

export function FoodLog_remove(log: IFoodLog, id: string): IFoodLog {
  return { ...log, entries: log.entries.filter((e) => e.id !== id) };
}

export function FoodLog_setGrams(log: IFoodLog, id: string, grams: number): IFoodLog {
  return {
    ...log,
    entries: log.entries.map((e) => {
      if (e.id !== id || grams <= 0) {
        return e;
      }
      if (e.per100g != null) {
        return { ...e, grams, nutrients: FoodLog_scale(e.per100g, grams) };
      }
      if (e.grams != null && e.grams > 0) {
        const k = grams / e.grams;
        const n = e.nutrients;
        const scaled = { calories: n.calories * k, protein: n.protein * k, carbs: n.carbs * k, fat: n.fat * k };
        return { ...e, grams, nutrients: FoodLog_sum([scaled]) };
      }
      return e;
    }),
  };
}

export function FoodLog_setMeal(log: IFoodLog, id: string, meal: IFoodMeal): IFoodLog {
  return { ...log, entries: log.entries.map((e) => (e.id === id ? { ...e, meal } : e)) };
}

export function FoodLog_copyDay(
  log: IFoodLog,
  fromDay: string,
  toDay: string,
  newId: () => string,
  now: number
): IFoodLog {
  const copies = FoodLog_entriesFor(log, fromDay).map((e) => ({ ...e, id: newId(), day: toDay, createdAt: now }));
  return { ...log, entries: [...log.entries, ...copies] };
}

export function FoodLog_setGoals(log: IFoodLog, goals: IFoodGoals): IFoodLog {
  return { ...log, goals };
}

export function FoodLog_setProfile(log: IFoodLog, profile: IFoodProfile): IFoodLog {
  return { ...log, profile };
}

export interface IFoodProgress {
  value: number;
  fraction: number;
  isOver: boolean;
}

export function FoodLog_progress(consumed: number, range: IFoodRange, mode: IFoodProgressMode): IFoodProgress {
  const fraction = range.max > 0 ? Math.min(1, Math.max(0, consumed / range.max)) : 0;
  const isOver = consumed > range.max;
  const value = mode === "consumed" ? consumed : Math.max(0, Math.round((range.min - consumed) * 10) / 10);
  return { value, fraction, isOver };
}

export function FoodLog_formatRange(range: IFoodRange, unit: string): string {
  return range.min === range.max ? `${range.min}${unit}` : `${range.min}-${range.max}${unit}`;
}

export function FoodLog_formatNumber(n: number): string {
  return Math.abs(n) >= 100 ? `${Math.round(n)}` : `${Math.round(n * 10) / 10}`;
}
