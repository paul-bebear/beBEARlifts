import { INutrients } from "./foodLog";
import { FoodMicros_fromCoreFields, FoodMicros_parse } from "./foodMicros";
import { IFoodProduct } from "./openFoodFacts";
import { UnknownValue_isFinite, UnknownValue_isRecord, UnknownValue_nonNegative } from "./unknownValue";

const maxSavedFoods = 500;

// A UPC-A code and the same code read as EAN-13 differ only by a leading zero.
function barcodeKey(barcode: string): string {
  return barcode.replace(/^0+/, "");
}

export function SavedFoods_find(saved: IFoodProduct[], barcode: string): IFoodProduct | undefined {
  const key = barcodeKey(barcode);
  return saved.find((p) => p.barcode != null && barcodeKey(p.barcode) === key);
}

function sameNameAndBrand(a: IFoodProduct, b: IFoodProduct): boolean {
  const key = (p: IFoodProduct): string => `${p.name.toLowerCase()}\u0000${(p.brand ?? "").toLowerCase()}`;
  return key(a) === key(b);
}

export function SavedFoods_save(saved: IFoodProduct[], product: IFoodProduct): IFoodProduct[] {
  const sameFood = (p: IFoodProduct): boolean =>
    product.barcode != null
      ? p.barcode != null && barcodeKey(p.barcode) === barcodeKey(product.barcode)
      : p.barcode == null && sameNameAndBrand(p, product);
  return [product, ...saved.filter((p) => !sameFood(p))].slice(0, maxSavedFoods);
}

export function SavedFoods_search(saved: IFoodProduct[], query: string): IFoodProduct[] {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) {
    return [];
  }
  return saved.filter((p) => {
    const text = `${p.name} ${p.brand ?? ""}`.toLowerCase();
    return words.every((w) => text.includes(w));
  });
}

export interface INutrientsRule {
  needs: "allFour" | "calories";
  micros: "microsField" | "coreFields";
}

function allFour(r: Record<string, unknown>): INutrients | undefined {
  const { calories, protein, carbs, fat } = r;
  if (
    !UnknownValue_isFinite(calories) ||
    !UnknownValue_isFinite(protein) ||
    !UnknownValue_isFinite(carbs) ||
    !UnknownValue_isFinite(fat)
  ) {
    return undefined;
  }
  return { calories, protein, carbs, fat };
}

function caloriesWithDefaults(r: Record<string, unknown>): INutrients | undefined {
  const calories = UnknownValue_nonNegative(r.calories);
  if (calories == null) {
    return undefined;
  }
  return {
    calories,
    protein: UnknownValue_nonNegative(r.protein) ?? 0,
    carbs: UnknownValue_nonNegative(r.carbs) ?? 0,
    fat: UnknownValue_nonNegative(r.fat) ?? 0,
  };
}

// foodLog.ts imports this file, so the shared reader lives here to keep the import one way.
export function SavedFoods_parseNutrients(raw: unknown, rule: INutrientsRule): INutrients | undefined {
  if (!UnknownValue_isRecord(raw)) {
    return undefined;
  }
  const nutrients = rule.needs === "allFour" ? allFour(raw) : caloriesWithDefaults(raw);
  if (nutrients == null) {
    return undefined;
  }
  const micros = rule.micros === "microsField" ? FoodMicros_parse(raw.micros) : FoodMicros_fromCoreFields(raw);
  return micros != null ? { ...nutrients, micros } : nutrients;
}

function parseProduct(raw: unknown): IFoodProduct | undefined {
  if (raw == null || typeof raw !== "object") {
    return undefined;
  }
  const r = raw as Record<string, unknown>;
  const per100g = SavedFoods_parseNutrients(r.per100g, { needs: "calories", micros: "microsField" });
  if (typeof r.name !== "string" || r.name.trim() === "" || per100g == null) {
    return undefined;
  }
  const product: IFoodProduct = { name: r.name, per100g };
  if (typeof r.barcode === "string" && r.barcode !== "") {
    product.barcode = r.barcode;
  }
  if (typeof r.brand === "string" && r.brand !== "") {
    product.brand = r.brand;
  }
  const servingGrams = UnknownValue_nonNegative(r.servingGrams);
  if (servingGrams != null && servingGrams > 0) {
    product.servingGrams = servingGrams;
  }
  return product;
}

export function SavedFoods_parse(raw: unknown): IFoodProduct[] {
  return Array.isArray(raw) ? raw.map(parseProduct).filter((p): p is IFoodProduct => p != null) : [];
}
