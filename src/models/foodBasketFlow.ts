import {
  FoodLog_addAll,
  FoodLog_saveFood,
  FoodLog_saveMeal,
  FoodLog_saveRecipe,
  IFoodLog,
  IFoodMeal,
  IFoodSavedMeal,
  INutrients,
} from "./foodLog";
import { FoodAddFlow_manualPick, FoodAddFlow_pickFromProduct, IFoodPick } from "./foodAddFlow";
import {
  FoodBasket_entries,
  FoodBasket_put,
  FoodBasket_putAll,
  FoodBasket_remove,
  FoodBasket_setGrams,
  FoodBasket_toggle,
  IFoodBasketItem,
} from "./foodBasket";
import { FoodLabel_saveFailed } from "./foodCapture";
import type { IFoodProduct } from "./openFoodFacts";
import { FoodSaveGuard_run, IFoodSaveGuard } from "./foodSaveGuard";
import { FoodScanSteps_entries, FoodScanSteps_shareFailed, IScanEvent, IScanServing } from "./foodScanSteps";
import { IMealPostDraft, IMealShareSwitch, MealPost_fromServing } from "./mealPost";
import { ICatalogRecipe, RecipeCatalog_basketKey, RecipeCatalog_servingPick } from "./recipeCatalog";
import { Recipes_fromBasket, Recipes_servingPick, SavedMeals_fromBasket, SavedMeals_items } from "./savedMeals";

export type IBasketEvent =
  | { type: "toggled"; pick: IFoodPick }
  | { type: "put"; pick: IFoodPick; grams: number }
  | { type: "removed"; key: string }
  | { type: "gramsChanged"; key: string; grams: number }
  | { type: "quickAdded"; name: string; nutrients: INutrients; now: number }
  | { type: "catalogRecipeAdded"; recipe: ICatalogRecipe; servings: number }
  | { type: "mealAdded"; meal: IFoodSavedMeal };

export function FoodBasketFlow_reduce(basket: IFoodBasketItem[], event: IBasketEvent): IFoodBasketItem[] {
  switch (event.type) {
    case "toggled":
      return FoodBasket_toggle(basket, event.pick);
    case "put":
      return FoodBasket_put(basket, event.pick, event.grams);
    case "removed":
      return FoodBasket_remove(basket, event.key);
    case "gramsChanged":
      return FoodBasket_setGrams(basket, event.key, event.grams);
    case "quickAdded":
      return FoodBasket_put(basket, FoodAddFlow_manualPick(event.name, event.nutrients), 0, `quick|${event.now}`);
    case "catalogRecipeAdded":
      return FoodBasket_put(
        basket,
        RecipeCatalog_servingPick(event.recipe, event.servings),
        0,
        RecipeCatalog_basketKey(event.recipe)
      );
    case "mealAdded":
      return FoodBasket_putAll(basket, SavedMeals_items(event.meal));
  }
}

export interface IFoodLogWrite {
  update: (change: (log: IFoodLog) => IFoodLog) => Promise<void>;
  newId: () => string;
  now: number;
}

export async function FoodBasketFlow_logBasket(
  basket: IFoodBasketItem[],
  where: { day: string; meal: IFoodMeal },
  guard: IFoodSaveGuard,
  write: IFoodLogWrite
): Promise<boolean> {
  const entries = FoodBasket_entries(basket, where, write.newId, write.now);
  return FoodSaveGuard_run(guard, () => write.update((log) => FoodLog_addAll(log, entries)), true);
}

export interface IServingLogDeps {
  guard: IFoodSaveGuard;
  write: IFoodLogWrite;
  share: IMealShareSwitch;
  newPostId: () => string;
  goBack: () => void;
  sharePost: (post: IMealPostDraft, photo?: string) => Promise<unknown>;
  alert: (message: string) => void;
}

// The screen closes before the share starts, so a slow upload never keeps the user on Serving size.
export async function FoodBasketFlow_logServing(
  serving: IScanServing,
  where: { day: string; meal: IFoodMeal },
  deps: IServingLogDeps
): Promise<void> {
  const entries = FoodScanSteps_entries(serving, where, deps.write.newId, deps.write.now);
  const save = (): Promise<void> => deps.write.update((log) => FoodLog_addAll(log, entries));
  if (!(await FoodSaveGuard_run(deps.guard, save, true))) {
    return;
  }
  deps.goBack();
  const post = MealPost_fromServing(serving, deps.share, deps.newPostId);
  if (post != null) {
    await deps.sharePost(post, serving.photo).catch(() => deps.alert(FoodScanSteps_shareFailed));
  }
}

export interface IGroupSaved {
  basket?: IFoodBasketItem[];
  isMealsTab?: boolean;
  step: IScanEvent;
}

export async function FoodBasketFlow_saveGroup(
  group: "meal" | "recipe",
  name: string,
  servings: number,
  basket: IFoodBasketItem[],
  guard: IFoodSaveGuard,
  write: Pick<IFoodLogWrite, "update" | "newId">
): Promise<IGroupSaved | undefined> {
  if (group === "meal") {
    const saved = SavedMeals_fromBasket(name, basket, write.newId());
    const isSaved = await FoodSaveGuard_run(guard, () => write.update((l) => FoodLog_saveMeal(l, saved)), false);
    return isSaved ? { isMealsTab: true, step: { type: "browseOpened" } } : undefined;
  }
  const recipe = Recipes_fromBasket(name, servings, basket, write.newId());
  const isSaved = await FoodSaveGuard_run(guard, () => write.update((l) => FoodLog_saveRecipe(l, recipe)), false);
  if (!isSaved) {
    return undefined;
  }
  return { basket: FoodBasket_put([], Recipes_servingPick(recipe)), step: { type: "basketOpened" } };
}

// A second tap while the first save runs keeps the guard set, so it stays silent. Only a real failure shows the notice.
export async function FoodBasketFlow_saveLabel(
  product: IFoodProduct,
  code: string | undefined,
  guard: IFoodSaveGuard,
  update: IFoodLogWrite["update"],
  alert: (message: string) => void
): Promise<IScanEvent | undefined> {
  const isSaved = await FoodSaveGuard_run(guard, () => update((l) => FoodLog_saveFood(l, product)), false);
  if (isSaved) {
    return { type: "amountOpened", pick: FoodAddFlow_pickFromProduct(product, code != null ? "barcode" : "search") };
  }
  if (!guard.current) {
    alert(FoodLabel_saveFailed);
  }
  return undefined;
}
