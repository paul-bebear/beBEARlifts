import { FoodLog_sum, IFoodEntry, IFoodMeal, INutrients } from "./foodLog";
import { FoodAddFlow_manualPick, IFoodPhotoChoice, IFoodPick } from "./foodAddFlow";
import {
  FoodBasket_entries,
  FoodBasket_fromChoices,
  FoodBasket_put,
  FoodBasket_putAll,
  FoodBasket_remove,
  FoodBasket_setGrams,
  FoodBasket_totals,
  IFoodBasketItem,
} from "./foodBasket";

export type IScanMode = "barcode" | "ai" | "describe";
export type IScanEntryMode = "barcode" | "photo" | "describe" | "quick" | undefined;

export interface IScanServing {
  mode: IScanMode;
  items: IFoodBasketItem[];
  descriptionOverride?: string;
  photo?: string;
  isShared?: boolean;
}

export type IScanStep =
  | { kind: "camera"; mode: IScanMode }
  | { kind: "reading"; code: string }
  | { kind: "notFound"; code: string; error?: string }
  | { kind: "serving"; serving: IScanServing }
  | { kind: "browse" }
  | { kind: "basket" }
  | { kind: "label"; code?: string }
  | { kind: "amount"; pick: IFoodPick }
  | { kind: "quick" }
  | { kind: "save"; group: "meal" | "recipe" };

export type IScanTile = "barcode" | "photo" | "describe" | "quick";

export type IScanEvent =
  | { type: "modePicked"; mode: IScanMode }
  | { type: "tileOpened"; tile: IScanTile; hasAi: boolean }
  | { type: "browseOpened" }
  | { type: "basketOpened" }
  | { type: "labelOpened"; code?: string }
  | { type: "amountOpened"; pick: IFoodPick }
  | { type: "quickOpened" }
  | { type: "saveOpened"; group: "meal" | "recipe" }
  | { type: "barcodeRead"; code: string }
  | { type: "barcodeFound"; pick: IFoodPick }
  | { type: "barcodeMissed"; code: string; error?: string }
  | { type: "photoReviewed"; choices: IFoodPhotoChoice[]; nonce: number; photo?: string }
  | { type: "describeReviewed"; choices: IFoodPhotoChoice[]; nonce: number }
  | { type: "quickEntered"; name: string; nutrients: INutrients }
  | { type: "gramsChanged"; key: string; grams: number }
  | { type: "itemRemoved"; key: string }
  | { type: "descriptionChanged"; text: string }
  | { type: "shareToggled"; isShared: boolean }
  | { type: "back" };

export function FoodScanSteps_modes(hasAi: boolean): IScanMode[] {
  return hasAi ? ["barcode", "ai", "describe"] : ["barcode", "describe"];
}

export function FoodScanSteps_initial(entry: IScanEntryMode, hasAi: boolean): IScanStep {
  if (entry === "quick") {
    return { kind: "quick" };
  }
  if (entry === "describe") {
    return { kind: "camera", mode: "describe" };
  }
  if (entry === "photo") {
    return { kind: "camera", mode: hasAi ? "ai" : "describe" };
  }
  return { kind: "camera", mode: "barcode" };
}

export function FoodScanSteps_canLeave(step: IScanStep): boolean {
  return step.kind === "camera";
}

export function FoodScanSteps_title(step: IScanStep): string | undefined {
  switch (step.kind) {
    case "basket":
      return "Item Log";
    case "reading":
    case "notFound":
      return "Scan barcode";
    case "label":
      return "Nutrition label";
    case "quick":
      return "Quick Log";
    case "serving":
      return "Serving size";
    case "camera":
      return step.mode === "barcode" ? "Scan barcode" : step.mode === "ai" ? "AI Scan" : "Describe";
    default:
      return undefined;
  }
}

export function FoodScanSteps_description(serving: IScanServing): string {
  return serving.descriptionOverride ?? serving.items.map((item) => item.pick.name).join(", ");
}

export function FoodScanSteps_totals(serving: IScanServing): INutrients {
  return FoodBasket_totals(serving.items);
}

export function FoodScanSteps_canAdd(serving: IScanServing): boolean {
  return serving.items.length > 0 && FoodScanSteps_description(serving).trim() !== "";
}

function servingOf(mode: IScanMode, items: IFoodBasketItem[]): IScanStep {
  return { kind: "serving", serving: { mode, items } };
}

function mapServing(step: IScanStep, change: (serving: IScanServing) => IScanServing): IScanStep {
  return step.kind === "serving" ? { kind: "serving", serving: change(step.serving) } : step;
}

function backFrom(step: IScanStep): IScanStep {
  switch (step.kind) {
    case "serving":
      return { kind: "camera", mode: step.serving.mode };
    case "reading":
    case "notFound":
      return { kind: "camera", mode: "barcode" };
    case "camera":
      return step;
    case "browse":
      return { kind: "camera", mode: "barcode" };
    default:
      return { kind: "browse" };
  }
}

export function FoodScanSteps_reduce(step: IScanStep, event: IScanEvent): IScanStep {
  switch (event.type) {
    case "modePicked":
      return { kind: "camera", mode: event.mode };
    case "tileOpened":
      return FoodScanSteps_initial(event.tile, event.hasAi);
    case "browseOpened":
      return { kind: "browse" };
    case "basketOpened":
      return { kind: "basket" };
    case "labelOpened":
      return { kind: "label", code: event.code };
    case "amountOpened":
      return { kind: "amount", pick: event.pick };
    case "quickOpened":
      return { kind: "quick" };
    case "saveOpened":
      return { kind: "save", group: event.group };
    case "barcodeRead":
      return { kind: "reading", code: event.code };
    case "barcodeFound":
      return servingOf("barcode", FoodBasket_put([], event.pick));
    case "barcodeMissed":
      return { kind: "notFound", code: event.code, error: event.error };
    case "photoReviewed": {
      const serving = servingOf(
        "ai",
        FoodBasket_putAll([], FoodBasket_fromChoices(event.choices, "photo", event.nonce))
      );
      return event.photo != null ? mapServing(serving, (s) => ({ ...s, photo: event.photo })) : serving;
    }
    case "describeReviewed":
      return servingOf("describe", FoodBasket_putAll([], FoodBasket_fromChoices(event.choices, "manual", event.nonce)));
    case "quickEntered":
      return servingOf("describe", FoodBasket_put([], FoodAddFlow_manualPick(event.name, event.nutrients), 0));
    case "gramsChanged":
      return mapServing(step, (s) => ({ ...s, items: FoodBasket_setGrams(s.items, event.key, event.grams) }));
    case "itemRemoved":
      return mapServing(step, (s) => ({ ...s, items: FoodBasket_remove(s.items, event.key) }));
    case "descriptionChanged":
      return mapServing(step, (s) => ({ ...s, descriptionOverride: event.text }));
    case "shareToggled":
      return mapServing(step, (s) => ({ ...s, isShared: event.isShared }));
    case "back":
      return backFrom(step);
  }
}

export function FoodScanSteps_entries(
  serving: IScanServing,
  where: { day: string; meal: IFoodMeal },
  newId: () => string,
  now: number
): IFoodEntry[] {
  const description = FoodScanSteps_description(serving).trim();
  const entries = FoodBasket_entries(serving.items, where, newId, now);
  if (entries.length === 0 || serving.descriptionOverride == null) {
    return entries;
  }
  if (entries.length === 1) {
    return [{ ...entries[0], name: description }];
  }
  const grams = entries.reduce((sum, entry) => sum + (entry.grams ?? 0), 0);
  const combined: IFoodEntry = {
    id: entries[0].id,
    day: where.day,
    meal: where.meal,
    name: description,
    source: entries[0].source,
    nutrients: FoodLog_sum(entries.map((entry) => entry.nutrients)),
    createdAt: now,
  };
  return [grams > 0 ? { ...combined, grams } : combined];
}
