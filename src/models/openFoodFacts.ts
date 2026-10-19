import { INutrients } from "./foodLog";

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

// Open Food Facts lets anyone edit, and some products carry an "energy-kcal" value that is the kJ number.
// When both fields exist and disagree by more than 20%, the kJ field converted to kcal is used.
function caloriesPer100g(nutriments: Record<string, unknown>): number | undefined {
  const kcal = num(nutriments["energy-kcal_100g"]);
  const kj = num(nutriments["energy-kj_100g"]) ?? num(nutriments.energy_100g);
  const fromKj = kj != null ? kj / kjPerKcal : undefined;
  if (kcal != null && fromKj != null && Math.abs(kcal - fromKj) > 0.2 * Math.max(kcal, fromKj)) {
    return Math.round(fromKj);
  }
  if (kcal != null) {
    return Math.round(kcal);
  }
  return fromKj != null ? Math.round(fromKj) : undefined;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

export function OpenFoodFacts_parseProduct(raw: unknown): IFoodProduct | undefined {
  if (raw == null || typeof raw !== "object") {
    return undefined;
  }
  const product = raw as Record<string, unknown>;
  const nutriments = (product.nutriments ?? {}) as Record<string, unknown>;
  const calories = caloriesPer100g(nutriments);
  const name = str(product.product_name) ?? str(product.generic_name);
  if (name == null || calories == null) {
    return undefined;
  }
  const servingGrams = num(product.serving_quantity);
  return {
    barcode: str(product.code),
    name,
    brand: firstBrand(product.brands),
    per100g: {
      calories,
      protein: round1(num(nutriments.proteins_100g) ?? 0),
      carbs: round1(num(nutriments.carbohydrates_100g) ?? 0),
      fat: round1(num(nutriments.fat_100g) ?? 0),
    },
    servingGrams: servingGrams != null && servingGrams > 0 ? servingGrams : undefined,
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
