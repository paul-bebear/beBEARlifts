import { JSX, useReducer, useRef, useState } from "react";
import { View, Pressable, ActivityIndicator } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Text } from "./primitives/text";
import {
  FoodLog_addAll,
  FoodLog_dayTotals,
  FoodLog_mealNames,
  FoodLog_removeMeal,
  FoodLog_removeRecipe,
  FoodLog_saveFood,
  FoodLog_saveMeal,
  FoodLog_saveRecipe,
  IFoodMeal,
} from "../models/foodLog";
import { FoodAddFlow_initialGrams, FoodAddFlow_manualPick, FoodAddFlow_pickFromProduct } from "../models/foodAddFlow";
import {
  FoodBasket_entries,
  FoodBasket_keyOf,
  FoodBasket_put,
  FoodBasket_putAll,
  FoodBasket_remove,
  FoodBasket_setGrams,
  FoodBasket_toggle,
  FoodBasket_totals,
  IFoodBasketItem,
} from "../models/foodBasket";
import {
  FoodScanSteps_canLeave,
  FoodScanSteps_entries,
  FoodScanSteps_initial,
  FoodScanSteps_reduce,
  FoodScanSteps_title,
  IScanServing,
} from "../models/foodScanSteps";
import { FoodSuggestions_forMeal } from "../models/foodSuggestions";
import { Recipes_fromBasket, Recipes_servingPick, SavedMeals_fromBasket, SavedMeals_items } from "../models/savedMeals";
import { FoodApi_lookupBarcode } from "../utils/foodApi";
import { FoodLogStore_newId, FoodLogStore_update, useFoodLog } from "../utils/foodLogStore";
import { Dialog_confirm } from "../utils/dialog";
import { useNavOptions } from "../navigation/useNavOptions";
import { NavScreenContent } from "../navigation/NavScreenContent";
import type { IFoodAddScreenParams } from "../navigation/types";
import { FoodBrowsePanel, IFoodBrowseTab, IFoodTile } from "./foodBrowsePanel";
import { FoodBasketPanel } from "./foodBasketPanel";
import { FoodAmountPanel } from "./foodAmountPanel";
import { FoodScanCamera } from "./foodScanCamera";
import { FoodServingPanel } from "./foodServingPanel";
import { FoodQuickAddPanel } from "./foodQuickAddPanel";
import { FoodLabelPanel } from "./foodLabelPanel";
import { FoodSaveGroupPanel } from "./foodSaveGroupPanel";
import { RecipeDetailPanel } from "./recipeDetailPanel";
import {
  RecipeCatalog_basketKey,
  RecipeCatalog_find,
  RecipeCatalog_isSaved,
  RecipeCatalog_servingPick,
  RecipeCatalog_toUserRecipe,
} from "../models/recipeCatalog";
import { FoodMealPicker } from "./foodUi";
import { Button } from "./button";
import { AiConsent_isFoodAi, AiConsent_showFeatures } from "../models/aiConsent";
import { AiConsentStore, AiConsent_ensure } from "../utils/aiConsentClient";
import { MealPost_fromServing, MealPost_newId, MealPost_shareSwitch } from "../models/mealPost";
import { Friends_forUser } from "../models/friends";
import { FeedClient_shareMeal } from "../utils/feedClient";
import { FriendsStore } from "../utils/friendsClient";
import { CloudStore } from "../utils/supabaseClient";
import { RandomBytes_get } from "../utils/randomBytes";

function NotFound(props: {
  code: string;
  error?: string;
  onLabel: () => void;
  onScan: () => void;
  onQuick: () => void;
}): JSX.Element {
  return (
    <View className="py-4">
      <Text className="text-base">
        {props.error ?? `Barcode ${props.code} is not in Open Food Facts or USDA, or it has no nutrition data.`}
      </Text>
      <View className="mt-4">
        <Button name="food-not-found-label" kind="pill" className="flex-1" onPress={props.onLabel}>
          Photo the nutrition label
        </Button>
      </View>
      <View className="flex-row mt-2" style={{ gap: 8 }}>
        <Button name="screen-food-add-scan-again" kind="pill-outline" className="flex-1" onPress={props.onScan}>
          Scan again
        </Button>
        <Button name="screen-food-add-quick-log" kind="pill-outline" className="flex-1" onPress={props.onQuick}>
          Quick Log
        </Button>
      </View>
    </View>
  );
}

function ReviewBar(props: { basket: IFoodBasketItem[]; onPress: () => void }): JSX.Element {
  const calories = FoodBasket_totals(props.basket).calories;
  return (
    <View className="px-4 pt-2 pb-3 bg-background-default">
      <Button
        name="food-review"
        kind="pill"
        className="flex-1"
        onPress={props.onPress}
      >{`Review ${props.basket.length} item${props.basket.length === 1 ? "" : "s"} · ${calories} Cal`}</Button>
    </View>
  );
}

export function ScreenFoodAdd(props: { params: IFoodAddScreenParams }): JSX.Element {
  const navigation = useNavigation();
  const isLoggingRef = useRef(false);
  const log = useFoodLog();
  const hasAi = AiConsent_showFeatures(AiConsentStore.use());
  const [step, send] = useReducer(FoodScanSteps_reduce, undefined, () =>
    FoodScanSteps_initial(props.params.mode, hasAi)
  );
  const [meal, setMeal] = useState<IFoodMeal>(props.params.meal);
  const [basket, setBasket] = useState<IFoodBasketItem[]>([]);
  const [isPickingMeal, setIsPickingMeal] = useState(false);
  const [browseTab, setBrowseTab] = useState<IFoodBrowseTab>("food");
  const browse = (): void => send({ type: "browseOpened" });
  const stepTitle = FoodScanSteps_title(step);
  const catalogRecipe = step.kind === "catalogRecipe" ? RecipeCatalog_find(step.recipeId) : undefined;
  const userId = CloudStore.use().session?.userId;
  const me = Friends_forUser(FriendsStore.use(), userId).me;
  const share = MealPost_shareSwitch(
    userId != null,
    me != null,
    step.kind === "serving" && step.serving.isShared === true
  );

  useNavOptions({
    navTitle:
      stepTitle != null ? (
        stepTitle
      ) : (
        <Pressable onPress={() => setIsPickingMeal(!isPickingMeal)} testID="food-add-meal-title">
          <Text className="text-lg font-semibold text-text-link">{FoodLog_mealNames[meal]} ▾</Text>
        </Pressable>
      ),
    navOnBack: () => {
      if (FoodScanSteps_canLeave(step)) {
        return true;
      }
      send({ type: "back" });
      return false;
    },
  });

  const onBarcode = async (code: string): Promise<void> => {
    send({ type: "barcodeRead", code });
    const result = await FoodApi_lookupBarcode(code, log.savedFoods);
    if (result.ok && result.value != null) {
      send({ type: "barcodeFound", pick: FoodAddFlow_pickFromProduct(result.value, "barcode") });
    } else {
      send({ type: "barcodeMissed", code, error: result.ok ? undefined : result.error });
    }
  };

  const saveGroup = async (group: "meal" | "recipe", name: string, servings: number): Promise<void> => {
    if (group === "meal") {
      await FoodLogStore_update((l) => FoodLog_saveMeal(l, SavedMeals_fromBasket(name, basket, FoodLogStore_newId())));
      setBrowseTab("meals");
      browse();
      return;
    }
    const recipe = Recipes_fromBasket(name, servings, basket, FoodLogStore_newId());
    await FoodLogStore_update((l) => FoodLog_saveRecipe(l, recipe));
    setBasket(FoodBasket_put([], Recipes_servingPick(recipe)));
    send({ type: "basketOpened" });
  };

  const logBasket = async (): Promise<void> => {
    if (isLoggingRef.current) {
      return;
    }
    isLoggingRef.current = true;
    const entries = FoodBasket_entries(basket, { day: props.params.day, meal }, FoodLogStore_newId, Date.now());
    await FoodLogStore_update((l) => FoodLog_addAll(l, entries));
    navigation.goBack();
  };

  const logServing = async (serving: IScanServing): Promise<void> => {
    if (isLoggingRef.current) {
      return;
    }
    isLoggingRef.current = true;
    const entries = FoodScanSteps_entries(serving, { day: props.params.day, meal }, FoodLogStore_newId, Date.now());
    await FoodLogStore_update((l) => FoodLog_addAll(l, entries));
    navigation.goBack();
    const post = MealPost_fromServing(serving, share, () => MealPost_newId(RandomBytes_get(16)));
    if (post != null) {
      await FeedClient_shareMeal(post, serving.photo);
    }
  };

  const onTile = async (tile: IFoodTile): Promise<void> => {
    if (!AiConsent_isFoodAi(tile) || (await AiConsent_ensure())) {
      send({ type: "tileOpened", tile, hasAi });
    }
  };

  return (
    <NavScreenContent
      footer={
        step.kind === "browse" && basket.length > 0 ? (
          <ReviewBar basket={basket} onPress={() => send({ type: "basketOpened" })} />
        ) : undefined
      }
    >
      <View className="px-4 pt-2 pb-6" testID="food-add-screen" data-testid="food-add-screen">
        {isPickingMeal && (
          <View className="mb-4">
            <FoodMealPicker
              meal={meal}
              onChange={(m) => {
                setMeal(m);
                setIsPickingMeal(false);
              }}
            />
          </View>
        )}
        {step.kind === "camera" && (
          <FoodScanCamera
            day={props.params.day}
            mode={step.mode}
            hasAi={hasAi}
            onMode={(mode) => send({ type: "modePicked", mode })}
            onBarcode={onBarcode}
            onPhotoReviewed={(choices, photo) => send({ type: "photoReviewed", choices, nonce: Date.now(), photo })}
            onDescribed={(choices) => send({ type: "describeReviewed", choices, nonce: Date.now() })}
            onQuick={(name, nutrients) => send({ type: "quickEntered", name, nutrients })}
            onSearch={browse}
            onCopied={() => navigation.goBack()}
          />
        )}
        {step.kind === "serving" && (
          <FoodServingPanel
            serving={step.serving}
            meal={meal}
            onMeal={setMeal}
            onGrams={(key, grams) => send({ type: "gramsChanged", key, grams })}
            onRemove={(key) => send({ type: "itemRemoved", key })}
            onDescription={(text) => send({ type: "descriptionChanged", text })}
            share={share}
            onShare={(isShared) => send({ type: "shareToggled", isShared })}
            onAdd={() => logServing(step.serving)}
          />
        )}
        {step.kind === "browse" && (
          <FoodBrowsePanel
            meal={meal}
            suggestions={FoodSuggestions_forMeal(log, meal, Date.now())}
            savedFoods={log.savedFoods}
            meals={log.meals}
            recipes={log.recipes}
            basket={basket}
            recipePick={Recipes_servingPick}
            onTile={onTile}
            onToggle={(pick) => setBasket(FoodBasket_toggle(basket, pick))}
            onOpen={(pick) => send({ type: "amountOpened", pick })}
            onAddMeal={(m) => {
              setBasket(FoodBasket_putAll(basket, SavedMeals_items(m)));
              send({ type: "basketOpened" });
            }}
            onDeleteMeal={async (m) => {
              if (await Dialog_confirm(`Delete the meal ${m.name}?`)) {
                await FoodLogStore_update((l) => FoodLog_removeMeal(l, m.id));
              }
            }}
            onDeleteRecipe={async (r) => {
              if (await Dialog_confirm(`Delete the recipe ${r.name}?`)) {
                await FoodLogStore_update((l) => FoodLog_removeRecipe(l, r.id));
              }
            }}
            onSaveMeal={() => send({ type: "saveOpened", group: "meal" })}
            onSaveRecipe={() => send({ type: "saveOpened", group: "recipe" })}
            dayConsumed={FoodLog_dayTotals(log, props.params.day)}
            goals={log.goals}
            onOpenCatalogRecipe={(recipe) => send({ type: "catalogRecipeOpened", recipeId: recipe.id })}
            tab={browseTab}
            onTab={setBrowseTab}
          />
        )}
        {step.kind === "basket" && (
          <FoodBasketPanel
            basket={basket}
            meal={meal}
            onMeal={setMeal}
            onGrams={(key, grams) => setBasket(FoodBasket_setGrams(basket, key, grams))}
            onRemove={(key) => setBasket(FoodBasket_remove(basket, key))}
            onAddMore={browse}
            onLog={logBasket}
          />
        )}
        {step.kind === "amount" && (
          <FoodAmountPanel
            pick={step.pick}
            initialGrams={
              basket.find((i) => i.key === FoodBasket_keyOf(step.pick))?.grams ?? FoodAddFlow_initialGrams(step.pick)
            }
            submitTitle="Add"
            onBack={browse}
            onSubmit={(grams) => {
              setBasket(FoodBasket_put(basket, step.pick, grams));
              browse();
            }}
          />
        )}
        {step.kind === "reading" && (
          <View className="items-center py-8">
            <ActivityIndicator />
            <Text className="mt-2 text-sm text-text-secondary">Looking up {step.code}…</Text>
          </View>
        )}
        {step.kind === "notFound" && (
          <NotFound
            code={step.code}
            error={step.error}
            onLabel={() => send({ type: "labelOpened", code: step.code })}
            onScan={() => send({ type: "modePicked", mode: "barcode" })}
            onQuick={() => send({ type: "quickOpened" })}
          />
        )}
        {step.kind === "label" && (
          <FoodLabelPanel
            barcode={step.code}
            onBack={browse}
            onSave={async (product) => {
              await FoodLogStore_update((l) => FoodLog_saveFood(l, product));
              send({
                type: "amountOpened",
                pick: FoodAddFlow_pickFromProduct(product, step.code != null ? "barcode" : "search"),
              });
            }}
          />
        )}
        {step.kind === "quick" && (
          <FoodQuickAddPanel
            onBack={browse}
            onSubmit={(name, nutrients) => {
              setBasket(FoodBasket_put(basket, FoodAddFlow_manualPick(name, nutrients), 0, `quick|${Date.now()}`));
              send({ type: "basketOpened" });
            }}
          />
        )}
        {catalogRecipe != null && (
          <RecipeDetailPanel
            recipe={catalogRecipe}
            isSaved={RecipeCatalog_isSaved(log.recipes, catalogRecipe)}
            onSave={() => FoodLogStore_update((l) => FoodLog_saveRecipe(l, RecipeCatalog_toUserRecipe(catalogRecipe)))}
            onLog={(servings) => {
              const pick = RecipeCatalog_servingPick(catalogRecipe, servings);
              setBasket(FoodBasket_put(basket, pick, 0, RecipeCatalog_basketKey(catalogRecipe)));
              send({ type: "basketOpened" });
            }}
            onBack={browse}
          />
        )}
        {step.kind === "save" && (
          <FoodSaveGroupPanel
            kind={step.group}
            count={basket.length}
            onBack={browse}
            onSave={(name, servings) => saveGroup(step.group, name, servings)}
          />
        )}
        {step.kind === "browse" && (
          <Pressable className="py-4" onPress={() => send({ type: "labelOpened" })} testID="food-add-label">
            <Text className="text-base text-text-link">+ Add a food from its nutrition label</Text>
          </Pressable>
        )}
      </View>
    </NavScreenContent>
  );
}
