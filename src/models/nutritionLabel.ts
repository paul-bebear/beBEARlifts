import { FoodLog_scale, INutrients } from "./foodLog";
import { JsonInText_extract } from "./jsonInText";
import { IFoodProduct } from "./openFoodFacts";

export interface INutritionLabel {
  name?: string;
  brand?: string;
  servingGrams?: number;
  perServing: INutrients;
  note?: string;
}

export interface INutritionLabelForm {
  name: string;
  brand: string;
  servingGrams: string;
  calories: string;
  protein: string;
  carbs: string;
  fat: string;
}

export type INutritionLabelResult = { ok: true; product: IFoodProduct } | { ok: false; error: string };

const gramsWhenUnknown = 100;

function num(value: unknown): number | undefined {
  return typeof value === "number" && isFinite(value) && value >= 0 ? value : undefined;
}

function str(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() !== "" ? value.trim() : undefined;
}

function parseNutrients(raw: unknown): INutrients | undefined {
  if (raw == null || typeof raw !== "object") {
    return undefined;
  }
  const r = raw as Record<string, unknown>;
  const calories = num(r.calories);
  if (calories == null) {
    return undefined;
  }
  return { calories, protein: num(r.protein) ?? 0, carbs: num(r.carbs) ?? 0, fat: num(r.fat) ?? 0 };
}

export function NutritionLabel_parse(text: string): INutritionLabel | undefined {
  const json = JsonInText_extract(text);
  if (json == null || typeof json !== "object") {
    return undefined;
  }
  const r = json as Record<string, unknown>;
  const stated = num(r.servingGrams);
  const servingGrams = stated != null && stated > 0 ? stated : undefined;
  const perServing = parseNutrients(r.perServing);
  const per100g = parseNutrients(r.per100g);
  const nutrients =
    perServing ?? (per100g != null ? FoodLog_scale(per100g, servingGrams ?? gramsWhenUnknown) : undefined);
  if (nutrients == null) {
    return undefined;
  }
  return {
    name: str(r.name),
    brand: str(r.brand),
    servingGrams: perServing != null ? servingGrams : (servingGrams ?? gramsWhenUnknown),
    perServing: nutrients,
    note: str(r.note),
  };
}

export function NutritionLabel_note(text: string): string | undefined {
  const json = JsonInText_extract(text);
  return json != null && typeof json === "object" ? str((json as Record<string, unknown>).note) : undefined;
}

function formNumber(n: number | undefined): string {
  return n == null ? "" : `${Math.round(n * 10) / 10}`;
}

export function NutritionLabel_toForm(label: INutritionLabel | undefined): INutritionLabelForm {
  return {
    name: label?.name ?? "",
    brand: label?.brand ?? "",
    servingGrams: formNumber(label?.servingGrams),
    calories: formNumber(label?.perServing.calories),
    protein: formNumber(label?.perServing.protein),
    carbs: formNumber(label?.perServing.carbs),
    fat: formNumber(label?.perServing.fat),
  };
}

function parseNumber(text: string): number | undefined {
  const trimmed = text.trim().replace(",", ".");
  if (trimmed === "") {
    return undefined;
  }
  const value = Number(trimmed);
  return isFinite(value) && value >= 0 ? value : undefined;
}

// Calories keep one decimal here, so one serving scales back to the label's own number.
function per100gFromServing(perServing: INutrients, grams: number): INutrients {
  const k = 100 / grams;
  const round1 = (n: number): number => Math.round(n * k * 10) / 10;
  return {
    calories: round1(perServing.calories),
    protein: round1(perServing.protein),
    carbs: round1(perServing.carbs),
    fat: round1(perServing.fat),
  };
}

export function NutritionLabel_toProduct(form: INutritionLabelForm, barcode?: string): INutritionLabelResult {
  const name = form.name.trim();
  const grams = parseNumber(form.servingGrams);
  const calories = parseNumber(form.calories);
  if (name === "") {
    return { ok: false, error: "Give the food a name." };
  }
  if (grams == null || grams === 0 || grams > 5000) {
    return { ok: false, error: "Enter the serving size in grams, from the label." };
  }
  if (calories == null) {
    return { ok: false, error: "Enter the calories per serving." };
  }
  const perServing: INutrients = {
    calories,
    protein: parseNumber(form.protein) ?? 0,
    carbs: parseNumber(form.carbs) ?? 0,
    fat: parseNumber(form.fat) ?? 0,
  };
  const product: IFoodProduct = { name, per100g: per100gFromServing(perServing, grams), servingGrams: grams };
  const brand = form.brand.trim();
  if (brand !== "") {
    product.brand = brand;
  }
  if (barcode != null) {
    product.barcode = barcode;
  }
  return { ok: true, product };
}
