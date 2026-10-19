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
  return typeof value === "number" && isFinite(value) && value >= 0 ? value : undefined;
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

export function FoodPhotoEstimate_parse(text: string): IFoodPhotoEstimate | undefined {
  const json = JsonInText_extract(text);
  if (json == null || typeof json !== "object") {
    return undefined;
  }
  const r = json as Record<string, unknown>;
  const items = Array.isArray(r.items) ? r.items.map(parseItem).filter((i): i is IFoodPhotoItem => i != null) : [];
  const note = typeof r.note === "string" && r.note.trim() !== "" ? r.note.trim() : undefined;
  if (items.length === 0 && note == null) {
    return undefined;
  }
  return { items, note };
}
