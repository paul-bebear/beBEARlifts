import { JSX, useState } from "react";
import { View, Pressable, ActivityIndicator } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Text } from "./primitives/text";
import {
  FoodLog_addAll,
  FoodLog_mealNames,
  FoodLog_removeMeal,
  FoodLog_removeRecipe,
  FoodLog_saveFood,
  FoodLog_saveMeal,
  FoodLog_saveRecipe,
  IFoodMeal,
} from "../models/foodLog";
import {
  FoodAddFlow_initialGrams,
  FoodAddFlow_manualPick,
  FoodAddFlow_pickFromProduct,
  IFoodPhotoChoice,
  IFoodPick,
} from "../models/foodAddFlow";
import {
  FoodBasket_entries,
  FoodBasket_fromChoices,
  FoodBasket_keyOf,
  FoodBasket_put,
  FoodBasket_putAll,
  FoodBasket_remove,
  FoodBasket_setGrams,
  FoodBasket_toggle,
  FoodBasket_totals,
  IFoodBasketItem,
} from "../models/foodBasket";
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
import { FoodBarcodeScanner } from "./foodBarcodeScanner";
import { FoodPhotoPanel } from "./foodPhotoPanel";
import { FoodDescribePanel } from "./foodDescribePanel";
import { FoodQuickAddPanel } from "./foodQuickAddPanel";
import { FoodLabelPanel } from "./foodLabelPanel";
import { FoodSaveGroupPanel } from "./foodSaveGroupPanel";
import { FoodMealPicker, FoodPrimaryButton } from "./foodUi";

type IStep =
  | { kind: "browse" }
  | { kind: "basket" }
  | { kind: "barcode" }
  | { kind: "lookup"; code: string }
  | { kind: "notFound"; code: string; error?: string }
  | { kind: "label"; code?: string }
  | { kind: "amount"; pick: IFoodPick }
  | { kind: "quick" }
  | { kind: "photo"; note?: string }
  | { kind: "describe" }
  | { kind: "save"; group: "meal" | "recipe" };

const stepTitles: Partial<Record<IStep["kind"], string>> = {
  basket: "Item Log",
  barcode: "Scan barcode",
  lookup: "Scan barcode",
  notFound: "Scan barcode",
  label: "Nutrition label",
  quick: "Quick Log",
  photo: "AI Scan",
  describe: "Describe",
};

function initialStep(mode: IFoodAddScreenParams["mode"]): IStep {
  return mode == null ? { kind: "browse" } : mode === "describe" ? { kind: "describe" } : { kind: mode };
}

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
        <FoodPrimaryButton testID="food-not-found-label" title="Photo the nutrition label" onPress={props.onLabel} />
      </View>
      <View className="flex-row mt-2" style={{ gap: 8 }}>
        <FoodPrimaryButton title="Scan again" kind="outline" onPress={props.onScan} />
        <FoodPrimaryButton title="Quick Log" kind="outline" onPress={props.onQuick} />
      </View>
    </View>
  );
}

function ReviewBar(props: { basket: IFoodBasketItem[]; onPress: () => void }): JSX.Element {
  const calories = FoodBasket_totals(props.basket).calories;
  return (
    <View className="px-4 pt-2 pb-3 bg-background-default">
      <FoodPrimaryButton
        testID="food-review"
        title={`Review ${props.basket.length} item${props.basket.length === 1 ? "" : "s"} · ${calories} Cal`}
        onPress={props.onPress}
      />
    </View>
  );
}

export function ScreenFoodAdd(props: { params: IFoodAddScreenParams }): JSX.Element {
  const navigation = useNavigation();
  const log = useFoodLog();
  const [step, setStep] = useState<IStep>(initialStep(props.params.mode));
  const [meal, setMeal] = useState<IFoodMeal>(props.params.meal);
  const [basket, setBasket] = useState<IFoodBasketItem[]>([]);
  const [isPickingMeal, setIsPickingMeal] = useState(false);
  const [browseTab, setBrowseTab] = useState<IFoodBrowseTab>("food");
  const browse = (): void => setStep({ kind: "browse" });
  const stepTitle = stepTitles[step.kind];

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
      if (step.kind === "browse") {
        return true;
      }
      browse();
      return false;
    },
  });

  const addChoices = (choices: IFoodPhotoChoice[], source: "photo" | "manual"): void => {
    setBasket(FoodBasket_putAll(basket, FoodBasket_fromChoices(choices, source, Date.now())));
    setStep({ kind: "basket" });
  };

  const onBarcode = async (code: string): Promise<void> => {
    setStep({ kind: "lookup", code });
    const result = await FoodApi_lookupBarcode(code, log.savedFoods);
    if (result.ok && result.value != null) {
      setStep({ kind: "amount", pick: FoodAddFlow_pickFromProduct(result.value, "barcode") });
    } else {
      setStep({ kind: "notFound", code, error: result.ok ? undefined : result.error });
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
    setStep({ kind: "basket" });
  };

  const logBasket = async (): Promise<void> => {
    const entries = FoodBasket_entries(basket, { day: props.params.day, meal }, FoodLogStore_newId, Date.now());
    await FoodLogStore_update((l) => FoodLog_addAll(l, entries));
    navigation.goBack();
  };

  const onTile = (tile: IFoodTile): void => setStep(tile === "describe" ? { kind: "describe" } : { kind: tile });

  return (
    <NavScreenContent
      footer={
        step.kind === "browse" && basket.length > 0 ? (
          <ReviewBar basket={basket} onPress={() => setStep({ kind: "basket" })} />
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
            onOpen={(pick) => setStep({ kind: "amount", pick })}
            onAddMeal={(m) => {
              setBasket(FoodBasket_putAll(basket, SavedMeals_items(m)));
              setStep({ kind: "basket" });
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
            onSaveMeal={() => setStep({ kind: "save", group: "meal" })}
            onSaveRecipe={() => setStep({ kind: "save", group: "recipe" })}
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
        {step.kind === "barcode" && <FoodBarcodeScanner onDetected={onBarcode} />}
        {step.kind === "lookup" && (
          <View className="items-center py-8">
            <ActivityIndicator />
            <Text className="mt-2 text-sm text-text-secondary">Looking up {step.code}…</Text>
          </View>
        )}
        {step.kind === "notFound" && (
          <NotFound
            code={step.code}
            error={step.error}
            onLabel={() => setStep({ kind: "label", code: step.code })}
            onScan={() => setStep({ kind: "barcode" })}
            onQuick={() => setStep({ kind: "quick" })}
          />
        )}
        {step.kind === "label" && (
          <FoodLabelPanel
            barcode={step.code}
            onBack={browse}
            onSave={async (product) => {
              await FoodLogStore_update((l) => FoodLog_saveFood(l, product));
              setStep({
                kind: "amount",
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
              setStep({ kind: "basket" });
            }}
          />
        )}
        {step.kind === "photo" && <FoodPhotoPanel initialNote={step.note} onAdd={(c) => addChoices(c, "photo")} />}
        {step.kind === "describe" && (
          <FoodDescribePanel
            onAdd={(c) => addChoices(c, "manual")}
            onPhoto={(note) => setStep({ kind: "photo", note })}
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
          <Pressable className="py-4" onPress={() => setStep({ kind: "label" })} testID="food-add-label">
            <Text className="text-base text-text-link">+ Add a food from its nutrition label</Text>
          </Pressable>
        )}
      </View>
    </NavScreenContent>
  );
}
