import { FoodLog_mealNames, IFoodGoals, IFoodMeal, INutrients } from "./foodLog";
import {
  ICatalogRecipe,
  IRecipeAllergen,
  IRecipeDiet,
  IRecipeEquipment,
  RecipeCatalog_all,
  RecipeCatalog_perServing,
} from "./recipeCatalog";

export interface IRecipeFilters {
  avoid: IRecipeAllergen[];
  diets: IRecipeDiet[];
  missingEquipment: IRecipeEquipment[];
  maxMinutes?: number;
}

export interface IRecipeRecommendation {
  recipe: ICatalogRecipe;
  perServing: INutrients;
  reasons: string[];
}

export interface IRecipeRecommendations {
  items: IRecipeRecommendation[];
  usesGoals: boolean;
}

export const RecipeRecommendations_noFilters: IRecipeFilters = { avoid: [], diets: [], missingEquipment: [] };

const quickMinutes = 25;

// An "unknown" tag never passes a filter: a missing label is not proof that a dish is safe.
export function RecipeRecommendations_passes(recipe: ICatalogRecipe, filters: IRecipeFilters): boolean {
  return (
    filters.avoid.every((a) => recipe.allergens[a] === "no") &&
    filters.diets.every((d) => recipe.diet[d] === "yes") &&
    filters.missingEquipment.every((e) => !recipe.equipment.includes(e)) &&
    (filters.maxMinutes == null || recipe.totalMinutes <= filters.maxMinutes)
  );
}

function round(n: number): number {
  return Math.round(n);
}

function rank(
  recipe: ICatalogRecipe,
  meal: IFoodMeal,
  consumed: INutrients,
  goals: IFoodGoals
): { score: number; reasons: string[]; perServing: INutrients } {
  const perServing = RecipeCatalog_perServing(recipe);
  const reasons: string[] = [];
  let score = 0;
  if (recipe.meals.includes(meal)) {
    score += 4;
    reasons.push(`Made for ${FoodLog_mealNames[meal].toLowerCase()}`);
  }
  const proteinLeft = goals.protein.min - consumed.protein;
  if (goals.protein.max > 0 && proteinLeft > 0) {
    const covered = Math.min(perServing.protein, proteinLeft);
    score += (6 * covered) / proteinLeft;
    if (perServing.protein <= proteinLeft + 5) {
      reasons.push(`Adds ${round(perServing.protein)} g of the ${round(proteinLeft)} g protein you still need`);
    }
  }
  const caloriesLeft = goals.calories.max - consumed.calories;
  if (goals.calories.max > 0) {
    if (perServing.calories <= caloriesLeft) {
      score += 2;
      reasons.push(`Fits your remaining ${round(caloriesLeft)} Cal`);
    } else {
      score -= 2;
    }
  }
  if (recipe.totalMinutes <= quickMinutes) {
    score += 1;
    reasons.push(`Ready in ${recipe.totalMinutes} minutes`);
  }
  return { score, reasons, perServing };
}

export function RecipeRecommendations_for(
  meal: IFoodMeal,
  consumed: INutrients,
  goals: IFoodGoals,
  filters: IRecipeFilters,
  recipes: ICatalogRecipe[] = RecipeCatalog_all()
): IRecipeRecommendations {
  const usesGoals = goals.calories.max > 0 || goals.protein.max > 0;
  const items = recipes
    .filter((recipe) => RecipeRecommendations_passes(recipe, filters))
    .map((recipe, index) => ({ recipe, index, ...rank(recipe, meal, consumed, goals) }))
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map(({ recipe, reasons, perServing }) => ({ recipe, reasons, perServing }));
  return { items, usesGoals };
}

export type IRecipeFilterChip =
  | { kind: "diet"; value: IRecipeDiet; title: string }
  | { kind: "avoid"; value: IRecipeAllergen; title: string }
  | { kind: "time"; value: number; title: string }
  | { kind: "equipment"; value: IRecipeEquipment; title: string };

export const RecipeRecommendations_chips: IRecipeFilterChip[] = [
  { kind: "diet", value: "vegetarian", title: "Vegetarian" },
  { kind: "diet", value: "vegan", title: "Vegan" },
  { kind: "avoid", value: "milk", title: "No milk" },
  { kind: "avoid", value: "egg", title: "No egg" },
  { kind: "avoid", value: "soy", title: "No soy" },
  { kind: "avoid", value: "wheat", title: "No wheat" },
  { kind: "avoid", value: "celery", title: "No celery" },
  { kind: "time", value: 30, title: "30 min or less" },
  { kind: "equipment", value: "instantPot", title: "No Instant Pot" },
];

function toggled<T>(list: T[], item: T): T[] {
  return list.includes(item) ? list.filter((i) => i !== item) : [...list, item];
}

export function RecipeRecommendations_chipIsOn(filters: IRecipeFilters, chip: IRecipeFilterChip): boolean {
  switch (chip.kind) {
    case "diet":
      return filters.diets.includes(chip.value);
    case "avoid":
      return filters.avoid.includes(chip.value);
    case "time":
      return filters.maxMinutes === chip.value;
    case "equipment":
      return filters.missingEquipment.includes(chip.value);
  }
}

export function RecipeRecommendations_toggleChip(filters: IRecipeFilters, chip: IRecipeFilterChip): IRecipeFilters {
  switch (chip.kind) {
    case "diet":
      return { ...filters, diets: toggled(filters.diets, chip.value) };
    case "avoid":
      return { ...filters, avoid: toggled(filters.avoid, chip.value) };
    case "time":
      return { ...filters, maxMinutes: filters.maxMinutes === chip.value ? undefined : chip.value };
    case "equipment":
      return { ...filters, missingEquipment: toggled(filters.missingEquipment, chip.value) };
  }
}

export function RecipeRecommendations_hasFilters(filters: IRecipeFilters): boolean {
  return (
    filters.avoid.length > 0 ||
    filters.diets.length > 0 ||
    filters.missingEquipment.length > 0 ||
    filters.maxMinutes != null
  );
}
