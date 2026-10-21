import { JSX, ReactNode, useEffect, useState } from "react";
import { View, Pressable, ActivityIndicator } from "react-native";
import { Text } from "./primitives/text";
import {
  FoodLog_formatNumber,
  FoodLog_mealNames,
  IFoodMeal,
  IFoodRecent,
  IFoodRecipe,
  IFoodSavedMeal,
} from "../models/foodLog";
import { IFoodProduct, OpenFoodFacts_isBarcode } from "../models/openFoodFacts";
import { FoodAddFlow_pickFromProduct, FoodAddFlow_pickFromRecent, IFoodPick } from "../models/foodAddFlow";
import { FoodBasket_has, IFoodBasketItem } from "../models/foodBasket";
import { Recipes_perServing, SavedMeals_totals } from "../models/savedMeals";
import { FoodApi_find } from "../utils/foodApi";
import { FoodTextInput } from "./foodUi";
import { IconBarcode } from "./icons/iconFoodUi";
import { IconCamera } from "./icons/iconCamera";
import { IconNotebook } from "./icons/iconNotebook";
import { IconFire } from "./icons/iconFire";
import { IconMagnifyingGlass } from "./icons/iconMagnifyingGlass";
import { IconTrash } from "./icons/iconTrash";
import { Tailwind_semantic } from "../utils/tailwindConfig";
import { AiConsent_isFoodAi, AiConsent_showFeatures } from "../models/aiConsent";
import { AiConsentStore } from "../utils/aiConsentClient";

export type IFoodTile = "barcode" | "photo" | "describe" | "quick";
export type IFoodBrowseTab = "food" | "meals" | "recipes";
type IBrowseTab = IFoodBrowseTab;

interface IProps {
  meal: IFoodMeal;
  suggestions: IFoodRecent[];
  savedFoods: IFoodProduct[];
  meals: IFoodSavedMeal[];
  recipes: IFoodRecipe[];
  basket: IFoodBasketItem[];
  recipePick: (recipe: IFoodRecipe) => IFoodPick;
  onTile: (tile: IFoodTile) => void;
  onToggle: (pick: IFoodPick) => void;
  onOpen: (pick: IFoodPick) => void;
  onAddMeal: (meal: IFoodSavedMeal) => void;
  onDeleteMeal: (meal: IFoodSavedMeal) => void;
  onDeleteRecipe: (recipe: IFoodRecipe) => void;
  onSaveMeal: () => void;
  onSaveRecipe: () => void;
  tab: IFoodBrowseTab;
  onTab: (tab: IFoodBrowseTab) => void;
}

const searchDelayMs = 450;

const tiles: { tile: IFoodTile; label: string; icon: (color: string) => ReactNode }[] = [
  { tile: "barcode", label: "Barcode", icon: (c) => <IconBarcode size={24} color={c} /> },
  { tile: "photo", label: "AI Scan", icon: (c) => <IconCamera size={24} color={c} /> },
  { tile: "describe", label: "Describe", icon: (c) => <IconNotebook size={22} color={c} /> },
  { tile: "quick", label: "Quick Log", icon: (c) => <IconFire size={22} color={c} /> },
];

function SelectCircle(props: { isSelected: boolean; onPress: () => void; testID?: string }): JSX.Element {
  return (
    <Pressable onPress={props.onPress} hitSlop={10} className="pl-3" testID={props.testID} data-testid={props.testID}>
      <View
        className={`items-center justify-center w-7 h-7 rounded-full border-2 ${
          props.isSelected ? "bg-blue-400 border-blue-400" : "border-border-prominent"
        }`}
      >
        {props.isSelected && <Text className="text-sm font-bold text-black">✓</Text>}
      </View>
    </Pressable>
  );
}

function FoodRow(props: {
  title: string;
  subtitle: string;
  calories: string;
  amount?: string;
  isSelected: boolean;
  onToggle: () => void;
  onPress: () => void;
  onDelete?: () => void;
}): JSX.Element {
  return (
    <View className="flex-row items-center px-4 py-3 mb-2 rounded-2xl bg-background-subtle" testID="food-row">
      {props.onDelete != null && (
        <Pressable
          onPress={props.onDelete}
          hitSlop={8}
          className="pr-3"
          testID="food-row-delete"
          data-testid="food-row-delete"
        >
          <IconTrash width={16} height={18} color={Tailwind_semantic().icon.neutral} />
        </Pressable>
      )}
      <Pressable
        className="flex-row items-center flex-1"
        onPress={props.onPress}
        testID="food-row-open"
        data-testid="food-row-open"
      >
        <View className="flex-1 pr-2">
          <Text className="text-base font-semibold" numberOfLines={2}>
            {props.title}
          </Text>
          <Text className="text-sm text-text-secondary" numberOfLines={1}>
            {props.subtitle}
          </Text>
        </View>
        <View className="items-end">
          <Text className="text-sm">{props.calories}</Text>
          {props.amount != null && <Text className="text-sm text-text-secondary">{props.amount}</Text>}
        </View>
      </Pressable>
      <SelectCircle isSelected={props.isSelected} onPress={props.onToggle} testID="food-row-select" />
    </View>
  );
}

function shortMacros(calories: number, protein: number): string {
  return `${Math.round(calories)} Cal · ${Math.round(protein)} P`;
}

function useFoodSearch(
  query: string,
  savedFoods: IFoodProduct[]
): {
  results: IFoodProduct[];
  isLoading: boolean;
  error?: string;
} {
  const [results, setResults] = useState<IFoodProduct[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);
  useEffect(() => {
    const text = query.trim();
    if (text.length < 2) {
      setResults([]);
      setIsLoading(false);
      setError(undefined);
      return undefined;
    }
    let isStale = false;
    setIsLoading(true);
    const timer = setTimeout(async () => {
      const result = await FoodApi_find(text, savedFoods);
      if (!isStale) {
        setIsLoading(false);
        setResults(result.ok ? result.value : []);
        setError(result.ok ? undefined : result.error);
      }
    }, searchDelayMs);
    return () => {
      isStale = true;
      clearTimeout(timer);
    };
  }, [query, savedFoods]);
  return { results, isLoading, error };
}

function FoodTab(props: IProps & { query: string }): JSX.Element {
  const search = useFoodSearch(props.query, props.savedFoods);
  const isSearching = props.query.trim().length >= 2;
  if (!isSearching) {
    return (
      <View>
        <Text className="px-1 pt-1 pb-3 text-2xl font-bold">
          Often logged for {FoodLog_mealNames[props.meal].toLowerCase()}
        </Text>
        {props.suggestions.length === 0 && (
          <Text className="px-1 py-3 text-sm text-text-secondary">
            Foods you log show up here. Search, scan a barcode or use AI Scan to start.
          </Text>
        )}
        {props.suggestions.map((r, i) => {
          const pick = FoodAddFlow_pickFromRecent(r);
          return (
            <FoodRow
              key={`${r.name}-${i}`}
              title={r.name}
              subtitle={r.brand ?? "Generic"}
              calories={shortMacros(r.nutrients.calories, r.nutrients.protein)}
              amount={r.grams != null ? `${FoodLog_formatNumber(r.grams)} g` : undefined}
              isSelected={FoodBasket_has(props.basket, pick)}
              onToggle={() => props.onToggle(pick)}
              onPress={() => props.onOpen(pick)}
            />
          );
        })}
      </View>
    );
  }
  const isBarcode = OpenFoodFacts_isBarcode(props.query.trim());
  return (
    <View>
      {search.isLoading && <ActivityIndicator className="py-4" />}
      {search.error != null && <Text className="py-3 text-sm text-text-error">{search.error}</Text>}
      {!search.isLoading && search.error == null && search.results.length === 0 && (
        <Text className="py-3 text-sm text-text-secondary">No matches. Try other words, Describe, or Quick Log.</Text>
      )}
      {search.results.map((p, i) => {
        const pick = FoodAddFlow_pickFromProduct(p, isBarcode ? "barcode" : "search");
        return (
          <FoodRow
            key={`${p.barcode ?? p.name}-${i}`}
            title={p.name}
            subtitle={p.brand ?? "Generic"}
            calories={shortMacros(p.per100g.calories, p.per100g.protein)}
            amount="per 100 g"
            isSelected={FoodBasket_has(props.basket, pick)}
            onToggle={() => props.onToggle(pick)}
            onPress={() => props.onOpen(pick)}
          />
        );
      })}
    </View>
  );
}

function SaveLink(props: { title: string; testID: string; onPress: () => void }): JSX.Element {
  return (
    <Pressable className="py-3" onPress={props.onPress} testID={props.testID} data-testid={props.testID}>
      <Text className="text-base text-text-link">{props.title}</Text>
    </Pressable>
  );
}

function MealsTab(props: IProps): JSX.Element {
  return (
    <View>
      {props.basket.length > 0 && (
        <SaveLink title="+ Save the selected foods as a meal" testID="food-save-meal" onPress={props.onSaveMeal} />
      )}
      {props.meals.length === 0 && (
        <Text className="py-3 text-sm text-text-secondary">
          A meal is a group of foods you log together, like your usual breakfast. Tick the foods, then save them here.
        </Text>
      )}
      {props.meals.map((meal) => {
        const totals = SavedMeals_totals(meal);
        return (
          <FoodRow
            key={meal.id}
            title={meal.name}
            subtitle={`${meal.items.length} food${meal.items.length === 1 ? "" : "s"}`}
            calories={shortMacros(totals.calories, totals.protein)}
            isSelected={false}
            onToggle={() => props.onAddMeal(meal)}
            onPress={() => props.onAddMeal(meal)}
            onDelete={() => props.onDeleteMeal(meal)}
          />
        );
      })}
    </View>
  );
}

function RecipesTab(props: IProps): JSX.Element {
  return (
    <View>
      {props.basket.length > 0 && (
        <SaveLink
          title="+ Make a recipe from the selected foods"
          testID="food-save-recipe"
          onPress={props.onSaveRecipe}
        />
      )}
      {props.recipes.length === 0 && (
        <Text className="py-3 text-sm text-text-secondary">
          A recipe is a dish you cook in batches. Tick its ingredients, make the recipe, then log one serving at a time.
        </Text>
      )}
      {props.recipes.map((recipe) => {
        const perServing = Recipes_perServing(recipe);
        const pick = props.recipePick(recipe);
        return (
          <FoodRow
            key={recipe.id}
            title={recipe.name}
            subtitle={`${recipe.servings} serving${recipe.servings === 1 ? "" : "s"} · per serving`}
            calories={shortMacros(perServing.calories, perServing.protein)}
            amount={pick.fixed?.grams != null ? `${pick.fixed.grams} g` : undefined}
            isSelected={FoodBasket_has(props.basket, pick)}
            onToggle={() => props.onToggle(pick)}
            onPress={() => props.onOpen(pick)}
            onDelete={() => props.onDeleteRecipe(recipe)}
          />
        );
      })}
    </View>
  );
}

export function FoodBrowsePanel(props: IProps): JSX.Element {
  const showAi = AiConsent_showFeatures(AiConsentStore.use());
  const [query, setQuery] = useState("");
  const { tab, onTab: setTab } = props;
  const semantic = Tailwind_semantic();
  const blue = semantic.icon.blue;
  return (
    <View testID="food-browse" data-testid="food-browse">
      <View className="flex-row items-center px-3 border-2 border-blue-400 rounded-full">
        <IconMagnifyingGlass size={20} color={blue} />
        <FoodTextInput
          testID="food-search-input"
          value={query}
          onChangeText={(text) => {
            setQuery(text);
            setTab("food");
          }}
          placeholder="Search foods or type a barcode"
          autoCorrect={false}
          returnKeyType="search"
          className="flex-1 border-0 bg-transparent"
        />
      </View>
      <View className="flex-row mt-4" style={{ gap: 8 }}>
        {tiles
          .filter((t) => showAi || !AiConsent_isFoodAi(t.tile))
          .map((t) => (
            <Pressable
              key={t.tile}
              testID={`food-tile-${t.tile}`}
              data-testid={`food-tile-${t.tile}`}
              onPress={() => props.onTile(t.tile)}
              className="items-center flex-1 py-3 rounded-2xl bg-background-subtle"
            >
              {t.icon(blue)}
              <Text className="mt-1 text-sm text-text-link" numberOfLines={1}>
                {t.label}
              </Text>
            </Pressable>
          ))}
      </View>
      <View className="flex-row mt-5 mb-3 border-b border-border-neutral">
        {(["food", "meals", "recipes"] as IBrowseTab[]).map((t) => (
          <Pressable
            key={t}
            testID={`food-browse-tab-${t}`}
            data-testid={`food-browse-tab-${t}`}
            onPress={() => setTab(t)}
            className={`items-center flex-1 pb-2.5 ${tab === t ? "border-b-2 border-blue-400" : ""}`}
          >
            <Text className={`text-lg ${tab === t ? "font-semibold" : "text-text-secondary"}`}>
              {t === "food" ? "Food" : t === "meals" ? "Meals" : "Recipes"}
            </Text>
          </Pressable>
        ))}
      </View>
      {tab === "food" && <FoodTab {...props} query={query} />}
      {tab === "meals" && <MealsTab {...props} />}
      {tab === "recipes" && <RecipesTab {...props} />}
    </View>
  );
}
