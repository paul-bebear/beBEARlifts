import {
  FoodLog_scale,
  FoodLog_sum,
  FoodLog_formatNumber,
  IFoodMeal,
  IFoodRecent,
  IFoodRecipe,
  INutrients,
} from "./foodLog";
import { IFoodPick } from "./foodAddFlow";
import { Recipes_perServing } from "./savedMeals";
import { RecipeCatalogData_recipes } from "./recipeCatalogData";

export type IRecipeTag = "yes" | "no" | "unknown";

export type IRecipeAllergen =
  | "milk"
  | "egg"
  | "fish"
  | "shellfish"
  | "treeNuts"
  | "peanuts"
  | "wheat"
  | "soy"
  | "sesame"
  | "celery";

export type IRecipeDiet = "vegetarian" | "vegan" | "glutenFree" | "dairyFree";

export type IRecipeEquipment = "instantPot" | "steamRack" | "siliconeEggMold" | "blender" | "ovenSafePan";

export interface ICatalogIngredient {
  text: string;
  // Raw weight used for the estimate. Absent when the item adds under 5 Cal to the whole batch.
  grams?: number;
  per100g?: INutrients;
  basis?: string;
}

export interface ICatalogRecipe {
  id: string;
  title: string;
  summary: string;
  photo?: { path: string; credit: string };
  meals: IFoodMeal[];
  prepMinutes: number;
  cookMinutes: number;
  totalMinutes: number;
  servings: number;
  servingNote: string;
  equipment: IRecipeEquipment[];
  ingredients: ICatalogIngredient[];
  steps: string[];
  allergens: Record<IRecipeAllergen, IRecipeTag>;
  diet: Record<IRecipeDiet, IRecipeTag>;
  unknownNotes: string[];
  printedPerServing: INutrients & { fiber: number; sugar: number; sodiumMg: number };
  nutritionCheck: string;
  source: { pdfPages: number[] };
}

export const RecipeCatalog_book = {
  title: "The Healthy Instant Pot Cookbook",
  author: "Karen Lee Young",
  publisher: "Rockridge Press",
  year: 2021,
};

export const RecipeCatalog_allergenNames: Record<IRecipeAllergen, string> = {
  milk: "Milk",
  egg: "Egg",
  fish: "Fish",
  shellfish: "Shellfish",
  treeNuts: "Tree nuts",
  peanuts: "Peanuts",
  wheat: "Wheat",
  soy: "Soy",
  sesame: "Sesame",
  celery: "Celery",
};

export const RecipeCatalog_dietNames: Record<IRecipeDiet, string> = {
  vegetarian: "Vegetarian",
  vegan: "Vegan",
  glutenFree: "Gluten-free",
  dairyFree: "Dairy-free",
};

export const RecipeCatalog_equipmentNames: Record<IRecipeEquipment, string> = {
  instantPot: "Instant Pot (6 quart)",
  steamRack: "Steam rack or trivet",
  siliconeEggMold: "Silicone egg bite mold",
  blender: "Blender",
  ovenSafePan: "Stainless steel cake pan or oven-safe bowl",
};

export function RecipeCatalog_all(): ICatalogRecipe[] {
  return RecipeCatalogData_recipes;
}

export function RecipeCatalog_find(id: string): ICatalogRecipe | undefined {
  return RecipeCatalogData_recipes.find((r) => r.id === id);
}

export function RecipeCatalog_userRecipeId(recipe: ICatalogRecipe): string {
  return `catalog-${recipe.id}`;
}

// No ingredient carries grams, because Recipes_servingPick would turn summed raw weights into a cooked serving weight.
export function RecipeCatalog_toUserRecipe(recipe: ICatalogRecipe): IFoodRecipe {
  const ingredients: IFoodRecent[] = recipe.ingredients
    .filter((i) => i.grams != null && i.per100g != null)
    .map((i) => ({ name: i.text, source: "manual", nutrients: FoodLog_scale(i.per100g!, i.grams!) }));
  return { id: RecipeCatalog_userRecipeId(recipe), name: recipe.title, servings: recipe.servings, ingredients };
}

export function RecipeCatalog_perServing(recipe: ICatalogRecipe): INutrients {
  return Recipes_perServing(RecipeCatalog_toUserRecipe(recipe));
}

export function RecipeCatalog_isSaved(recipes: IFoodRecipe[], recipe: ICatalogRecipe): boolean {
  const id = RecipeCatalog_userRecipeId(recipe);
  return recipes.some((r) => r.id === id);
}

export function RecipeCatalog_servingsLabel(servings: number): string {
  return `${FoodLog_formatNumber(servings)} serving${servings === 1 ? "" : "s"}`;
}

export function RecipeCatalog_parseServings(text: string): number | undefined {
  const value = Number(text.replace(",", "."));
  return isFinite(value) && value > 0 && value <= 20 ? Math.round(value * 100) / 100 : undefined;
}

export function RecipeCatalog_basketKey(recipe: ICatalogRecipe): string {
  return `catalog|${recipe.id}`;
}

// The serving count is applied here once. The pick has no grams, so the basket logs these numbers as they are.
export function RecipeCatalog_servingPick(recipe: ICatalogRecipe, servings: number): IFoodPick {
  const one = RecipeCatalog_perServing(recipe);
  const nutrients = FoodLog_sum([
    {
      calories: one.calories * servings,
      protein: one.protein * servings,
      carbs: one.carbs * servings,
      fat: one.fat * servings,
    },
  ]);
  return {
    name: recipe.title,
    brand: `Recipe · ${RecipeCatalog_servingsLabel(servings)}`,
    source: "manual",
    fixed: { nutrients },
  };
}

export function RecipeCatalog_tags(recipe: ICatalogRecipe): {
  contains: string[];
  unknownAllergens: string[];
  diets: string[];
  unknownDiets: string[];
} {
  const allergens = Object.keys(recipe.allergens) as IRecipeAllergen[];
  const diets = Object.keys(recipe.diet) as IRecipeDiet[];
  return {
    contains: allergens.filter((a) => recipe.allergens[a] === "yes").map((a) => RecipeCatalog_allergenNames[a]),
    unknownAllergens: allergens
      .filter((a) => recipe.allergens[a] === "unknown")
      .map((a) => RecipeCatalog_allergenNames[a]),
    diets: diets.filter((d) => recipe.diet[d] === "yes").map((d) => RecipeCatalog_dietNames[d]),
    unknownDiets: diets.filter((d) => recipe.diet[d] === "unknown").map((d) => RecipeCatalog_dietNames[d]),
  };
}

export function RecipeCatalog_sourceLine(recipe: ICatalogRecipe): string {
  const pages = recipe.source.pdfPages;
  const range = pages.length > 1 ? `PDF pages ${pages[0]}-${pages[pages.length - 1]}` : `PDF page ${pages[0]}`;
  return `${RecipeCatalog_book.title} by ${RecipeCatalog_book.author} (${RecipeCatalog_book.publisher}, ${RecipeCatalog_book.year}), ${range}`;
}
