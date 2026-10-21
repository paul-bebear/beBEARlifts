import { INutrients } from "./foodLog";
import { JsonInText_extract } from "./jsonInText";

export interface IFoodPhotoItem {
  name: string;
  grams: number;
  nutrients: INutrients;
}

export interface IFoodPhotoEstimate {
  items: IFoodPhotoItem[];
  note?: string;
}

function num(value: unknown): number | undefined {
  const n = typeof value === "string" ? parseFloat(value.replace(/^[^\d.]+/, "")) : value;
  return typeof n === "number" && isFinite(n) && n >= 0 ? n : undefined;
}

function parseItem(raw: unknown): IFoodPhotoItem | undefined {
  if (raw == null || typeof raw !== "object") {
    return undefined;
  }
  const r = raw as Record<string, unknown>;
  const name = typeof r.name === "string" ? r.name.trim() : "";
  const grams = num(r.grams);
  const calories = num(r.calories);
  if (name === "" || grams == null || grams === 0 || calories == null) {
    return undefined;
  }
  return {
    name,
    grams: Math.round(grams),
    nutrients: {
      calories: Math.round(calories),
      protein: Math.round((num(r.protein) ?? 0) * 10) / 10,
      carbs: Math.round((num(r.carbs) ?? 0) * 10) / 10,
      fat: Math.round((num(r.fat) ?? 0) * 10) / 10,
    },
  };
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
