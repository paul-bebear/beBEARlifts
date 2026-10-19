import { FoodLog_sum, IFoodRecipe, IFoodSavedMeal, INutrients } from "./foodLog";
import { FoodAddFlow_pickFromRecent, IFoodPick } from "./foodAddFlow";
import { FoodBasket_toRecents, IFoodBasketItem } from "./foodBasket";

export function SavedMeals_fromBasket(name: string, basket: IFoodBasketItem[], id: string): IFoodSavedMeal {
  return { id, name: name.trim() || "My meal", items: FoodBasket_toRecents(basket) };
}

export function SavedMeals_items(meal: IFoodSavedMeal): { pick: IFoodPick; grams: number }[] {
  return meal.items.map((item) => ({ pick: FoodAddFlow_pickFromRecent(item), grams: item.grams ?? 0 }));
}

export function SavedMeals_totals(meal: IFoodSavedMeal): INutrients {
  return FoodLog_sum(meal.items.map((i) => i.nutrients));
}

export function Recipes_fromBasket(name: string, servings: number, basket: IFoodBasketItem[], id: string): IFoodRecipe {
  return {
    id,
    name: name.trim() || "My recipe",
    servings: servings > 0 ? servings : 1,
    ingredients: FoodBasket_toRecents(basket),
  };
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

export function Recipes_perServing(recipe: IFoodRecipe): INutrients {
  const total = FoodLog_sum(recipe.ingredients.map((i) => i.nutrients));
  return {
    calories: Math.round(total.calories / recipe.servings),
    protein: round1(total.protein / recipe.servings),
    carbs: round1(total.carbs / recipe.servings),
    fat: round1(total.fat / recipe.servings),
  };
}

// The serving weight is only known when every ingredient has grams. Without it the serving logs as fixed numbers.
export function Recipes_servingPick(recipe: IFoodRecipe): IFoodPick {
  const allWeighed = recipe.ingredients.every((i) => i.grams != null && i.grams > 0);
  const totalGrams = recipe.ingredients.reduce((sum, i) => sum + (i.grams ?? 0), 0);
  return {
    name: recipe.name,
    brand: "Recipe",
    source: "manual",
    fixed: {
      grams: allWeighed ? Math.round(totalGrams / recipe.servings) : undefined,
      nutrients: Recipes_perServing(recipe),
    },
  };
}
