import { INutrients } from "./foodLog";
import { IFoodProduct } from "./openFoodFacts";

const maxSavedFoods = 500;

// A UPC-A code and the same code read as EAN-13 differ only by a leading zero.
function barcodeKey(barcode: string): string {
  return barcode.replace(/^0+/, "");
}

export function SavedFoods_find(saved: IFoodProduct[], barcode: string): IFoodProduct | undefined {
  const key = barcodeKey(barcode);
  return saved.find((p) => p.barcode != null && barcodeKey(p.barcode) === key);
}

export function SavedFoods_save(saved: IFoodProduct[], product: IFoodProduct): IFoodProduct[] {
  const sameFood = (p: IFoodProduct): boolean =>
    product.barcode != null
      ? p.barcode != null && barcodeKey(p.barcode) === barcodeKey(product.barcode)
      : p.barcode == null && p.name.toLowerCase() === product.name.toLowerCase();
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

function num(value: unknown): number | undefined {
  return typeof value === "number" && isFinite(value) && value >= 0 ? value : undefined;
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

function parseProduct(raw: unknown): IFoodProduct | undefined {
  if (raw == null || typeof raw !== "object") {
    return undefined;
  }
  const r = raw as Record<string, unknown>;
  const per100g = parseNutrients(r.per100g);
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
  const servingGrams = num(r.servingGrams);
  if (servingGrams != null && servingGrams > 0) {
    product.servingGrams = servingGrams;
  }
  return product;
}

export function SavedFoods_parse(raw: unknown): IFoodProduct[] {
  return Array.isArray(raw) ? raw.map(parseProduct).filter((p): p is IFoodProduct => p != null) : [];
}
