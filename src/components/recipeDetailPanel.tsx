import { JSX, ReactNode, useState } from "react";
import { View } from "react-native";
import { Text } from "./primitives/text";
import { Button } from "./button";
import { FoodChip, FoodNutrientsRow, FoodTextInput } from "./foodUi";
import { RecipePhoto } from "./recipePhoto";
import { FoodLog_formatNumber } from "../models/foodLog";
import {
  ICatalogRecipe,
  RecipeCatalog_equipmentNames,
  RecipeCatalog_parseServings,
  RecipeCatalog_servingPick,
  RecipeCatalog_servingsLabel,
  RecipeCatalog_sourceLine,
  RecipeCatalog_tags,
} from "../models/recipeCatalog";

interface IProps {
  recipe: ICatalogRecipe;
  isSaved: boolean;
  onSave: () => void;
  onLog: (servings: number) => void;
  onBack: () => void;
}

const quickServings = [0.5, 1, 1.5, 2];

function Section(props: { title: string; children: ReactNode; testID?: string }): JSX.Element {
  return (
    <View className="mt-5" testID={props.testID} data-testid={props.testID}>
      <Text className="mb-1.5 text-lg font-bold">{props.title}</Text>
      {props.children}
    </View>
  );
}

function Lines(props: { items: string[]; numbered?: boolean }): JSX.Element {
  return (
    <View>
      {props.items.map((item, i) => (
        <View key={`${i}-${item}`} className="flex-row mt-1">
          <Text className="w-6 text-base text-text-secondary">{props.numbered ? `${i + 1}.` : "•"}</Text>
          <Text className="flex-1 text-base">{item}</Text>
        </View>
      ))}
    </View>
  );
}

export function RecipeDetailPanel(props: IProps): JSX.Element {
  const { recipe } = props;
  const [servingsText, setServingsText] = useState("1");
  const servings = RecipeCatalog_parseServings(servingsText);
  const pick = RecipeCatalog_servingPick(recipe, servings ?? 1);
  const tags = RecipeCatalog_tags(recipe);
  const printed = recipe.printedPerServing;

  return (
    <View testID="recipe-detail" data-testid="recipe-detail">
      <RecipePhoto recipe={recipe} height={220} showCredit={true} />
      <Text className="mt-3 text-2xl font-bold">{recipe.title}</Text>
      <Text className="mt-1 text-base text-text-secondary">{recipe.summary}</Text>
      <Text className="mt-2 text-sm">
        Prep {recipe.prepMinutes} min · Cook {recipe.cookMinutes} min · Total {recipe.totalMinutes} min ·{" "}
        {recipe.servings} servings
      </Text>
      <Text className="text-sm text-text-secondary">{recipe.servingNote}</Text>

      <Section title="How much did you eat?">
        <View className="flex-row flex-wrap" style={{ gap: 6 }}>
          {quickServings.map((s) => (
            <FoodChip
              key={s}
              title={RecipeCatalog_servingsLabel(s)}
              isActive={servings === s}
              onPress={() => setServingsText(FoodLog_formatNumber(s))}
              testID={`recipe-servings-${s}`}
            />
          ))}
        </View>
        <View className="flex-row items-center mt-2">
          <Text className="mr-2 text-base">Servings</Text>
          <FoodTextInput
            testID="recipe-servings"
            value={servingsText}
            onChangeText={setServingsText}
            keyboardType="decimal-pad"
            inputMode="decimal"
            selectTextOnFocus={true}
            style={{ width: 90, textAlign: "center" }}
          />
        </View>
        <View className="mt-3">
          <FoodNutrientsRow nutrients={pick.fixed!.nutrients} />
        </View>
        <Text className="mt-1 text-xs text-text-secondary">
          Estimate from the ingredient list. The book prints {printed.calories} Cal, {printed.protein} g protein,{" "}
          {printed.carbs} g carbs and {printed.fat} g fat per serving, plus {printed.fiber} g fiber, {printed.sugar} g
          sugar and {printed.sodiumMg} mg sodium.
        </Text>
        <Text className="mt-1 text-xs text-text-secondary">{recipe.nutritionCheck}</Text>
      </Section>

      <View className="flex-row mt-4" style={{ gap: 8 }}>
        <Button name="recipe-detail-back" kind="pill-outline" className="flex-1" onPress={props.onBack}>
          Back
        </Button>
        <Button
          name="recipe-detail-save"
          kind="pill-outline"
          className="flex-1"
          disabled={props.isSaved}
          onPress={props.onSave}
        >
          {props.isSaved ? "Saved" : "Save recipe"}
        </Button>
      </View>
      <View className="mt-2">
        <Button
          name="recipe-detail-log"
          kind="pill"
          className="flex-1"
          disabled={servings == null}
          onPress={() => servings != null && props.onLog(servings)}
        >
          {servings == null ? "Enter servings" : `Log ${RecipeCatalog_servingsLabel(servings)}`}
        </Button>
      </View>

      <Section title="Ingredients" testID="recipe-ingredients">
        <Lines items={recipe.ingredients.map((i) => i.text)} />
      </Section>
      <Section title="Steps" testID="recipe-steps">
        <Lines items={recipe.steps} numbered={true} />
      </Section>
      <Section title="Equipment">
        <Lines items={recipe.equipment.map((e) => RecipeCatalog_equipmentNames[e])} />
      </Section>
      <Section title="Allergens and diet" testID="recipe-tags">
        <Text className="text-base">
          Contains: {tags.contains.length > 0 ? tags.contains.join(", ") : "none listed"}
        </Text>
        {tags.unknownAllergens.length > 0 && (
          <Text className="mt-1 text-base">Unknown, check labels: {tags.unknownAllergens.join(", ")}</Text>
        )}
        {tags.diets.length > 0 && <Text className="mt-1 text-base">Suits: {tags.diets.join(", ")}</Text>}
        {tags.unknownDiets.length > 0 && (
          <Text className="mt-1 text-base">Unknown: {tags.unknownDiets.join(", ")}</Text>
        )}
        {recipe.unknownNotes.length > 0 && (
          <View className="mt-1">
            <Lines items={recipe.unknownNotes} />
          </View>
        )}
      </Section>
      <Section title="Source">
        <Text className="text-sm text-text-secondary">{RecipeCatalog_sourceLine(recipe)}</Text>
      </Section>
    </View>
  );
}
