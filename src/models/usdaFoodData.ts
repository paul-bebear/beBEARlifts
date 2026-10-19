import { INutrients } from "./foodLog";
import { IFoodProduct } from "./openFoodFacts";

const kjPerKcal = 4.184;

// FoodData Central nutrient numbers. Branded foods report these per 100 g (or 100 ml).
const nutrientNumbers = {
  kcal: ["208", "957", "958"],
  kj: ["268"],
  protein: ["203"],
  fat: ["204"],
  carbs: ["205"],
};

function num(value: unknown): number | undefined {
  return typeof value === "number" && isFinite(value) && value >= 0 ? value : undefined;
}

function str(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() !== "" ? value.trim() : undefined;
}

function barcodeKey(barcode: string): string {
  return barcode.replace(/^0+/, "");
}

// Branded food names arrive in capitals ("HOT CHICKEN FLAVOR RAMEN").
function readableCase(text: string): string {
  if (text !== text.toUpperCase()) {
    return text;
  }
  return text
    .toLowerCase()
    .replace(/(^|[\s(/-])(\p{L})/gu, (_, start: string, letter: string) => start + letter.toUpperCase());
}

function nutrientValue(nutrients: unknown[], numbers: string[]): number | undefined {
  for (const n of numbers) {
    const found = nutrients.find(
      (item) => item != null && typeof item === "object" && `${(item as Record<string, unknown>).nutrientNumber}` === n
    ) as Record<string, unknown> | undefined;
    const value = num(found?.value);
    if (value != null) {
      return value;
    }
  }
  return undefined;
}

function parseNutrients(nutrients: unknown[]): INutrients | undefined {
  const kj = nutrientValue(nutrients, nutrientNumbers.kj);
  const calories = nutrientValue(nutrients, nutrientNumbers.kcal) ?? (kj != null ? kj / kjPerKcal : undefined);
  if (calories == null) {
    return undefined;
  }
  const round1 = (n: number | undefined): number => Math.round((n ?? 0) * 10) / 10;
  return {
    calories: Math.round(calories),
    protein: round1(nutrientValue(nutrients, nutrientNumbers.protein)),
    carbs: round1(nutrientValue(nutrients, nutrientNumbers.carbs)),
    fat: round1(nutrientValue(nutrients, nutrientNumbers.fat)),
  };
}

function parseFood(raw: Record<string, unknown>, barcode: string): IFoodProduct | undefined {
  const name = str(raw.description);
  const per100g = Array.isArray(raw.foodNutrients) ? parseNutrients(raw.foodNutrients) : undefined;
  if (name == null || per100g == null) {
    return undefined;
  }
  const product: IFoodProduct = { barcode, name: readableCase(name), per100g };
  const brand = str(raw.brandName) ?? str(raw.brandOwner);
  if (brand != null) {
    product.brand = readableCase(brand);
  }
  const unit = str(raw.servingSizeUnit)?.toLowerCase();
  const serving = num(raw.servingSize);
  if (serving != null && serving > 0 && (unit === "g" || unit === "grm" || unit === "ml" || unit === "mlt")) {
    product.servingGrams = Math.round(serving * 10) / 10;
  }
  return product;
}

export function UsdaFoodData_parseBarcodeResponse(raw: unknown, barcode: string): IFoodProduct | undefined {
  if (raw == null || typeof raw !== "object") {
    return undefined;
  }
  const foods = (raw as Record<string, unknown>).foods;
  if (!Array.isArray(foods)) {
    return undefined;
  }
  const key = barcodeKey(barcode);
  for (const food of foods) {
    if (food == null || typeof food !== "object") {
      continue;
    }
    const gtin = str((food as Record<string, unknown>).gtinUpc);
    const product =
      gtin != null && barcodeKey(gtin) === key ? parseFood(food as Record<string, unknown>, barcode) : undefined;
    if (product != null) {
      return product;
    }
  }
  return undefined;
}
