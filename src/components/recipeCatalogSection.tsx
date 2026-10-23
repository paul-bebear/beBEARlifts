import { JSX, useState } from "react";
import { Pressable, View } from "react-native";
import { Text } from "./primitives/text";
import { FoodChip } from "./foodUi";
import { RecipePhoto } from "./recipePhoto";
import { FoodLog_formatNumber, IFoodGoals, IFoodMeal, INutrients } from "../models/foodLog";
import { ICatalogRecipe, RecipeCatalog_all } from "../models/recipeCatalog";
import {
  IRecipeFilters,
  IRecipeRecommendation,
  RecipeRecommendations_chipIsOn,
  RecipeRecommendations_chips,
  RecipeRecommendations_for,
  RecipeRecommendations_hasFilters,
  RecipeRecommendations_noFilters,
  RecipeRecommendations_toggleChip,
} from "../models/recipeRecommendations";

interface IProps {
  meal: IFoodMeal;
  consumed: INutrients;
  goals: IFoodGoals;
  onOpen: (recipe: ICatalogRecipe) => void;
}

function RecipeCard(props: { item: IRecipeRecommendation; onPress: () => void }): JSX.Element {
  const { recipe, perServing, reasons } = props.item;
  return (
    <Pressable
      onPress={props.onPress}
      accessibilityRole="button"
      className="p-3 mb-3 rounded-2xl bg-background-subtle"
      testID={`recipe-card-${recipe.id}`}
      data-testid={`recipe-card-${recipe.id}`}
    >
      <RecipePhoto recipe={recipe} height={140} />
      <Text className="mt-2 text-lg font-bold">{recipe.title}</Text>
      <Text className="text-sm text-text-secondary">
        Prep {recipe.prepMinutes} min · Cook {recipe.cookMinutes} min · {recipe.servings} servings
      </Text>
      <Text className="mt-1 text-sm">
        {perServing.calories} Cal · {FoodLog_formatNumber(perServing.protein)} g protein per serving (estimate)
      </Text>
      {reasons.slice(0, 2).map((reason) => (
        <Text key={reason} className="mt-1 text-sm text-text-success">
          {reason}
        </Text>
      ))}
    </Pressable>
  );
}

export function RecipeCatalogSection(props: IProps): JSX.Element {
  const [filters, setFilters] = useState<IRecipeFilters>(RecipeRecommendations_noFilters);
  const result = RecipeRecommendations_for(props.meal, props.consumed, props.goals, filters);
  const total = RecipeCatalog_all().length;
  return (
    <View className="mt-4" testID="recipe-catalog" data-testid="recipe-catalog">
      <Text className="text-xl font-bold">From the cookbook</Text>
      <Text className="mt-1 text-sm text-text-secondary">
        {result.usesGoals
          ? "Ranked by your meal and what is left of today's targets. Ideas only, nothing logs until you tap Log."
          : "Set your food targets to rank these by what is left today. Ideas only, nothing logs until you tap Log."}
      </Text>
      <View className="flex-row flex-wrap mt-3 mb-3" style={{ gap: 6 }}>
        {RecipeRecommendations_chips.map((chip) => (
          <FoodChip
            key={`${chip.kind}-${chip.value}`}
            title={chip.title}
            isActive={RecipeRecommendations_chipIsOn(filters, chip)}
            onPress={() => setFilters(RecipeRecommendations_toggleChip(filters, chip))}
            testID={`recipe-filter-${chip.value}`}
          />
        ))}
      </View>
      {result.items.length === 0 && (
        <View className="p-4 rounded-2xl bg-background-subtle" testID="recipe-catalog-empty">
          <Text className="text-base">
            None of the {total} cookbook recipes match these filters. Recipes with an unknown label are left out.
          </Text>
          {RecipeRecommendations_hasFilters(filters) && (
            <Pressable className="mt-2" onPress={() => setFilters(RecipeRecommendations_noFilters)}>
              <Text className="text-base text-text-link">Clear filters</Text>
            </Pressable>
          )}
        </View>
      )}
      {result.items.map((item) => (
        <RecipeCard key={item.recipe.id} item={item} onPress={() => props.onOpen(item.recipe)} />
      ))}
    </View>
  );
}
