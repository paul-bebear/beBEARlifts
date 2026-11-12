import { INutrients } from "./foodLog";
import { FoodMicros_fromGrams, FoodMicros_sodiumFromSalt, FoodMicros_table, IMicros } from "./foodMicros";

export interface IFoodProduct {
  barcode?: string;
  name: string;
  brand?: string;
  per100g: INutrients;
  servingGrams?: number;
  imageUrl?: string;
}

const kjPerKcal = 4.184;

function num(value: unknown): number | undefined {
  if (typeof value === "number" && isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim() !== "" && isFinite(Number(value))) {
    return Number(value);
  }
  return undefined;
}

function str(value: unknown): string | undefined {
  if (typeof value === "string" && value.trim() !== "") {
    return value.trim();
  }
  if (Array.isArray(value)) {
    return str(value[0]);
  }
  return undefined;
}

function firstBrand(brands: unknown): string | undefined {
  const brand = str(brands);
  return brand?.split(",")[0].trim();
}

type INutriments = Record<string, unknown>;
type IPortion = "_100g" | "_serving";

// Open Food Facts lets anyone edit, and some products carry an "energy-kcal" value that is the kJ number.
// When both fields exist and disagree by more than 20%, the kJ field converted to kcal is used.
function energyKcal(nutriments: INutriments, portion: IPortion): number | undefined {
  const kcal = num(nutriments[`energy-kcal${portion}`]);
  const kj = num(nutriments[`energy-kj${portion}`]) ?? num(nutriments[`energy${portion}`]);
  const fromKj = kj != null ? kj / kjPerKcal : undefined;
  if (kcal != null && fromKj != null && Math.abs(kcal - fromKj) > 0.2 * Math.max(kcal, fromKj)) {
    return fromKj;
  }
  return kcal ?? fromKj;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function servingGrams(product: Record<string, unknown>): number | undefined {
  const quantity = num(product.serving_quantity);
  if (quantity != null && quantity > 0) {
    return quantity;
  }
  const match = str(product.serving_size)?.match(/(\d+(?:[.,]\d+)?)\s*(?:g|gr|grams?|ml)\b/i);
  const parsed = match != null ? Number(match[1].replace(",", ".")) : undefined;
  return parsed != null && parsed > 0 ? parsed : undefined;
}

// Imports are often entered only in their own language ("product_name_ko"), leaving "product_name" empty.
function productName(product: Record<string, unknown>): string | undefined {
  const localized = Object.keys(product)
    .filter((key) => /^product_name_[a-z]{2}$/.test(key) && key !== "product_name_en")
    .map((key) => str(product[key]));
  const candidates = [
    product.product_name,
    product.product_name_en,
    ...localized,
    product.generic_name,
    product.generic_name_en,
    product.abbreviated_product_name,
  ];
  for (const candidate of candidates) {
    const name = str(candidate);
    if (name != null) {
      return name;
    }
  }
  return undefined;
}

function per100g(nutriments: INutriments, grams: number | undefined): INutrients | undefined {
  const perServingFactor = grams != null ? 100 / grams : undefined;
  const value = (read: (portion: IPortion) => number | undefined): number | undefined => {
    const direct = read("_100g");
    if (direct != null) {
      return direct;
    }
    const serving = read("_serving");
    return serving != null && perServingFactor != null ? serving * perServingFactor : undefined;
  };
  const calories = value((portion) => energyKcal(nutriments, portion));
  if (calories == null) {
    return undefined;
  }
  const macro = (name: string): number => round1(value((portion) => num(nutriments[`${name}${portion}`])) ?? 0);
  const result: INutrients = {
    calories: Math.round(calories),
    protein: macro("proteins"),
    carbs: macro("carbohydrates"),
    fat: macro("fat"),
  };
  const micros = readMicros(value, nutriments);
  return micros != null ? { ...result, micros } : result;
}

function nonNegative(value: unknown): number | undefined {
  const n = num(value);
  return n != null && n >= 0 ? n : undefined;
}

function readMicros(
  value: (read: (portion: IPortion) => number | undefined) => number | undefined,
  nutriments: INutriments
): IMicros | undefined {
  const micros: IMicros = {};
  for (const row of FoodMicros_table) {
    const grams = value((portion) => nonNegative(nutriments[`${row.openFoodFacts}${portion}`]));
    const saltGrams =
      row.key === "sodium" && grams == null ? value((portion) => nonNegative(nutriments[`salt${portion}`])) : undefined;
    const known = grams ?? (saltGrams != null ? FoodMicros_sodiumFromSalt(saltGrams) : undefined);
    if (known != null) {
      micros[row.key] = FoodMicros_fromGrams(row.unit, known);
    }
  }
  return Object.keys(micros).length > 0 ? micros : undefined;
}

export function OpenFoodFacts_parseProduct(raw: unknown): IFoodProduct | undefined {
  if (raw == null || typeof raw !== "object") {
    return undefined;
  }
  const product = raw as Record<string, unknown>;
  const grams = servingGrams(product);
  const nutrients = per100g((product.nutriments ?? {}) as INutriments, grams);
  const name = productName(product);
  if (name == null || nutrients == null) {
    return undefined;
  }
  return {
    barcode: str(product.code),
    name,
    brand: firstBrand(product.brands),
    per100g: nutrients,
    servingGrams: grams,
    imageUrl: str(product.image_front_small_url),
  };
}

export function OpenFoodFacts_parseBarcodeResponse(raw: unknown): IFoodProduct | undefined {
  if (raw == null || typeof raw !== "object") {
    return undefined;
  }
  const response = raw as Record<string, unknown>;
  if (response.status !== 1) {
    return undefined;
  }
  return OpenFoodFacts_parseProduct(response.product);
}

export function OpenFoodFacts_parseSearchResponse(raw: unknown): IFoodProduct[] {
  if (raw == null || typeof raw !== "object") {
    return [];
  }
  const hits = (raw as Record<string, unknown>).hits;
  if (!Array.isArray(hits)) {
    return [];
  }
  return hits.map(OpenFoodFacts_parseProduct).filter((p): p is IFoodProduct => p != null);
}

export function OpenFoodFacts_isBarcode(text: string): boolean {
  return /^\d{8,14}$/.test(text.trim());
}

export function OpenFoodFacts_firstBarcode(values: Array<string | undefined>): string | undefined {
  return values
    .map((value) => value?.trim())
    .find((value): value is string => value != null && OpenFoodFacts_isBarcode(value));
}
