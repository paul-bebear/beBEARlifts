import { FoodLog_sum, FoodLog_toRecent, IFoodEntry, IFoodMeal, IFoodRecent, INutrients } from "./foodLog";
import {
  FoodAddFlow_entryFromPick,
  FoodAddFlow_initialGrams,
  FoodAddFlow_nutrientsFor,
  IFoodPhotoChoice,
  IFoodPick,
} from "./foodAddFlow";

export interface IFoodBasketItem {
  key: string;
  pick: IFoodPick;
  grams: number;
}

export function FoodBasket_keyOf(pick: IFoodPick): string {
  return pick.barcode ?? `${pick.source}|${pick.name}|${pick.brand ?? ""}`.toLowerCase();
}

export function FoodBasket_has(basket: IFoodBasketItem[], pick: IFoodPick): boolean {
  const key = FoodBasket_keyOf(pick);
  return basket.some((item) => item.key === key);
}

export function FoodBasket_put(
  basket: IFoodBasketItem[],
  pick: IFoodPick,
  grams?: number,
  key: string = FoodBasket_keyOf(pick)
): IFoodBasketItem[] {
  const hasPortion = pick.per100g != null || pick.fixed?.grams != null;
  const item = { key, pick, grams: grams ?? (hasPortion ? FoodAddFlow_initialGrams(pick) : 0) };
  return basket.some((i) => i.key === key) ? basket.map((i) => (i.key === key ? item : i)) : [...basket, item];
}

export function FoodBasket_toggle(basket: IFoodBasketItem[], pick: IFoodPick): IFoodBasketItem[] {
  return FoodBasket_has(basket, pick)
    ? FoodBasket_remove(basket, FoodBasket_keyOf(pick))
    : FoodBasket_put(basket, pick);
}

export function FoodBasket_putAll(
  basket: IFoodBasketItem[],
  items: { pick: IFoodPick; grams: number; key?: string }[]
): IFoodBasketItem[] {
  return items.reduce((b, item) => FoodBasket_put(b, item.pick, item.grams, item.key), basket);
}

export function FoodBasket_remove(basket: IFoodBasketItem[], key: string): IFoodBasketItem[] {
  return basket.filter((item) => item.key !== key);
}

export function FoodBasket_setGrams(basket: IFoodBasketItem[], key: string, grams: number): IFoodBasketItem[] {
  return grams > 0 ? basket.map((item) => (item.key === key ? { ...item, grams } : item)) : basket;
}

export function FoodBasket_nutrients(item: IFoodBasketItem): INutrients {
  return FoodAddFlow_nutrientsFor(item.pick, item.grams);
}

export function FoodBasket_hasPortion(item: IFoodBasketItem): boolean {
  return item.pick.per100g != null || item.pick.fixed?.grams != null;
}

export function FoodBasket_totals(basket: IFoodBasketItem[]): INutrients {
  return FoodLog_sum(basket.map(FoodBasket_nutrients));
}

export function FoodBasket_entries(
  basket: IFoodBasketItem[],
  where: { day: string; meal: IFoodMeal },
  newId: () => string,
  now: number
): IFoodEntry[] {
  return basket.map((item) => FoodAddFlow_entryFromPick(item.pick, item.grams, where, newId(), now));
}

export function FoodBasket_toRecents(basket: IFoodBasketItem[]): IFoodRecent[] {
  return FoodBasket_entries(basket, { day: "", meal: "snacks" }, () => "", 0).map(FoodLog_toRecent);
}

// AI items get keys of their own, so two "rice" rows from one photo, or from two photos, stay separate.
export function FoodBasket_fromChoices(
  choices: IFoodPhotoChoice[],
  source: "photo" | "manual",
  nonce: number
): { pick: IFoodPick; grams: number; key: string }[] {
  return choices
    .filter((c) => c.isSelected)
    .map((c, i) => ({
      pick: { name: c.name, source, fixed: { grams: c.grams, nutrients: c.nutrients } },
      grams: c.grams,
      key: `ai|${nonce}|${i}`,
    }));
}
