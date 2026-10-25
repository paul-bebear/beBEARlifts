import { INutrients } from "./foodLog";
import { JsonInText_extract } from "./jsonInText";

export interface IFoodPhotoItem {
  name: string;
  grams: number;
  nutrients: INutrients;
  isAmountSuspect?: boolean;
}

export interface IFoodPhotoEstimate {
  items: IFoodPhotoItem[];
  note?: string;
}

function num(value: unknown): number | undefined {
  const n = typeof value === "string" ? parseFloat(value.replace(/^[^\d.]+/, "")) : value;
  return typeof n === "number" && isFinite(n) && n >= 0 ? n : undefined;
}

const fatCaloriesPerGram = 9;
const macroMismatchShare = 0.15;
const macroMismatchCalories = 20;

function oneDecimal(value: number): number {
  return Math.round(value * 10) / 10;
}

function checkedCalories(calories: number, macros: Omit<INutrients, "calories">, alcohol: number | undefined): number {
  const fromMacros = 4 * macros.protein + 4 * macros.carbs + 9 * macros.fat + 7 * (alcohol ?? 0);
  const gap = Math.abs(calories - fromMacros);
  if (fromMacros === 0 || gap <= Math.max(fromMacros * macroMismatchShare, macroMismatchCalories)) {
    return calories;
  }
  // An answer without an alcohol field may hide alcohol in the calorie surplus, so only a shortfall is fixed then.
  return alcohol != null || calories < fromMacros ? Math.round(fromMacros) : calories;
}

function parseItem(raw: unknown): IFoodPhotoItem | undefined {
  if (raw == null || typeof raw !== "object") {
    return undefined;
  }
  const r = raw as Record<string, unknown>;
  const name = typeof r.name === "string" ? r.name.trim() : "";
  const grams = num(r.grams);
  const rawCalories = num(r.calories);
  if (name === "" || grams == null || grams === 0 || rawCalories == null) {
    return undefined;
  }
  const macros = {
    protein: oneDecimal(num(r.protein) ?? 0),
    carbs: oneDecimal(num(r.carbs) ?? 0),
    fat: oneDecimal(num(r.fat) ?? 0),
  };
  const calories = checkedCalories(Math.round(rawCalories), macros, num(r.alcohol));
  const item: IFoodPhotoItem = { name, grams: Math.round(grams), nutrients: { calories, ...macros } };
  if (calories > fatCaloriesPerGram * grams) {
    item.isAmountSuspect = true;
  }
  return item;
}

export const FoodPhotoEstimate_cutOffNote = "The answer was cut off, so some foods may be missing. Add them by hand.";

function salvageItems(text: string): IFoodPhotoEstimate | undefined {
  const start = text.indexOf('"items"');
  if (start === -1) {
    return undefined;
  }
  const items: IFoodPhotoItem[] = [];
  for (const match of text.slice(start).match(/\{[^{}]*\}/g) ?? []) {
    try {
      const item = parseItem(JSON.parse(match));
      if (item != null) {
        items.push(item);
      }
    } catch {
      continue;
    }
  }
  return items.length > 0 ? { items, note: FoodPhotoEstimate_cutOffNote } : undefined;
}

export function FoodPhotoEstimate_failure(text: string, finishReason: string | undefined, retryHint: string): string {
  if (text.trim() === "") {
    return "The AI sent back an empty answer. Try again.";
  }
  if (finishReason === "length") {
    return "The answer was too long. Scan fewer foods at once, or describe them in two parts.";
  }
  return `The AI answer could not be read. ${retryHint}`;
}

export function FoodPhotoEstimate_parse(text: string): IFoodPhotoEstimate | undefined {
  const json = JsonInText_extract(text);
  if (json == null || typeof json !== "object") {
    return salvageItems(text);
  }
  const r = json as Record<string, unknown>;
  const items = Array.isArray(r.items) ? r.items.map(parseItem).filter((i): i is IFoodPhotoItem => i != null) : [];
  const note = typeof r.note === "string" && r.note.trim() !== "" ? r.note.trim() : undefined;
  if (items.length === 0 && note == null) {
    return undefined;
  }
  return { items, note };
}
