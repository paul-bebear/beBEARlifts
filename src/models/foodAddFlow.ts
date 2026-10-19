import { FoodLog_scale, IFoodEntry, IFoodMeal, IFoodRecent, IFoodSource, INutrients } from "./foodLog";
import { IFoodPhotoItem } from "./foodPhotoEstimate";
import { IFoodProduct } from "./openFoodFacts";

export interface IFoodPick {
  name: string;
  brand?: string;
  source: IFoodSource;
  barcode?: string;
  per100g?: INutrients;
  servingGrams?: number;
  fixed?: { grams?: number; nutrients: INutrients };
}

export interface IFoodPhotoChoice extends IFoodPhotoItem {
  isSelected: boolean;
}

const defaultGrams = 100;

export function FoodAddFlow_pickFromProduct(product: IFoodProduct, source: "barcode" | "search"): IFoodPick {
  return {
    name: product.name,
    brand: product.brand,
    source,
    barcode: product.barcode,
    per100g: product.per100g,
    servingGrams: product.servingGrams,
  };
}

export function FoodAddFlow_pickFromRecent(recent: IFoodRecent): IFoodPick {
  return {
    name: recent.name,
    brand: recent.brand,
    source: recent.source,
    barcode: recent.barcode,
    per100g: recent.per100g,
    servingGrams: recent.per100g != null ? recent.grams : undefined,
    fixed: recent.per100g == null ? { grams: recent.grams, nutrients: recent.nutrients } : undefined,
  };
}

export function FoodAddFlow_initialGrams(pick: IFoodPick): number {
  return pick.servingGrams ?? pick.fixed?.grams ?? defaultGrams;
}

export function FoodAddFlow_nutrientsFor(pick: IFoodPick, grams: number): INutrients {
  if (pick.per100g != null) {
    return FoodLog_scale(pick.per100g, grams);
  }
  const fixed = pick.fixed;
  if (fixed == null) {
    return { calories: 0, protein: 0, carbs: 0, fat: 0 };
  }
  if (fixed.grams == null || fixed.grams <= 0) {
    return fixed.nutrients;
  }
  return FoodLog_scale(fixed.nutrients, (100 * grams) / fixed.grams);
}

export function FoodAddFlow_parseGrams(text: string): number | undefined {
  const value = Number(text.replace(",", "."));
  return isFinite(value) && value > 0 && value <= 5000 ? Math.round(value * 10) / 10 : undefined;
}

export function FoodAddFlow_entryFromPick(
  pick: IFoodPick,
  grams: number,
  where: { day: string; meal: IFoodMeal },
  id: string,
  now: number
): IFoodEntry {
  const entry: IFoodEntry = {
    id,
    day: where.day,
    meal: where.meal,
    name: pick.name,
    source: pick.source,
    nutrients: FoodAddFlow_nutrientsFor(pick, grams),
    createdAt: now,
  };
  if (grams > 0) {
    entry.grams = grams;
  }
  if (pick.brand != null) {
    entry.brand = pick.brand;
  }
  if (pick.barcode != null) {
    entry.barcode = pick.barcode;
  }
  if (pick.per100g != null) {
    entry.per100g = pick.per100g;
  }
  return entry;
}

export function FoodAddFlow_photoChoices(items: IFoodPhotoItem[]): IFoodPhotoChoice[] {
  return items.map((item) => ({ ...item, isSelected: true }));
}

export function FoodAddFlow_setPhotoGrams(
  choices: IFoodPhotoChoice[],
  index: number,
  grams: number
): IFoodPhotoChoice[] {
  return choices.map((choice, i) => {
    if (i !== index || grams <= 0) {
      return choice;
    }
    const pick: IFoodPick = {
      name: choice.name,
      source: "photo",
      fixed: { grams: choice.grams, nutrients: choice.nutrients },
    };
    return { ...choice, grams, nutrients: FoodAddFlow_nutrientsFor(pick, grams) };
  });
}

export function FoodAddFlow_entriesFromPhoto(
  choices: IFoodPhotoChoice[],
  where: { day: string; meal: IFoodMeal },
  newId: () => string,
  now: number
): IFoodEntry[] {
  return choices
    .filter((c) => c.isSelected)
    .map((c) => ({
      id: newId(),
      day: where.day,
      meal: where.meal,
      name: c.name,
      source: "photo" as const,
      grams: c.grams,
      nutrients: c.nutrients,
      createdAt: now,
    }));
}

export function FoodAddFlow_manualPick(name: string, nutrients: INutrients): IFoodPick {
  return { name: name.trim() || "Quick add", source: "manual", fixed: { nutrients } };
}
