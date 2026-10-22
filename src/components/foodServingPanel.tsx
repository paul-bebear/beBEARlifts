import { JSX, useState } from "react";
import { Image, View, Pressable } from "react-native";
import { IMealShareSwitch } from "../models/mealPost";
import { Text } from "./primitives/text";
import { Switch } from "./primitives/switch";
import { FoodLog_mealNames, IFoodMeal } from "../models/foodLog";
import { FoodAddFlow_parseGrams } from "../models/foodAddFlow";
import { FoodBasket_hasPortion, IFoodBasketItem } from "../models/foodBasket";
import {
  FoodScanSteps_canAdd,
  FoodScanSteps_description,
  FoodScanSteps_totals,
  IScanServing,
} from "../models/foodScanSteps";
import { FoodMealPicker, FoodNutrientsRow, FoodTextInput } from "./foodUi";
import { Button } from "./button";

interface IProps {
  serving: IScanServing;
  meal: IFoodMeal;
  onMeal: (meal: IFoodMeal) => void;
  onGrams: (key: string, grams: number) => void;
  onRemove: (key: string) => void;
  onDescription: (text: string) => void;
  share: IMealShareSwitch;
  onShare: (isShared: boolean) => void;
  onAdd: () => void;
}

function ItemRow(props: {
  item: IFoodBasketItem;
  canRemove: boolean;
  onGrams: (grams: number) => void;
  onRemove: () => void;
}): JSX.Element {
  const { item } = props;
  const [gramsText, setGramsText] = useState(`${item.grams}`);
  const commit = (): void => {
    const grams = FoodAddFlow_parseGrams(gramsText);
    if (grams != null && grams !== item.grams) {
      props.onGrams(grams);
    }
  };
  return (
    <View className="flex-row items-center py-2.5 border-b border-border-neutral" testID="food-serving-item">
      <View className="flex-1 pr-2">
        <Text className="text-base" numberOfLines={2}>
          {item.pick.name}
        </Text>
        {item.pick.brand != null && <Text className="text-xs text-text-secondary">{item.pick.brand}</Text>}
      </View>
      {FoodBasket_hasPortion(item) && (
        <>
          <FoodTextInput
            testID="food-grams"
            value={gramsText}
            onChangeText={setGramsText}
            keyboardType="decimal-pad"
            inputMode="decimal"
            selectTextOnFocus={true}
            style={{ width: 72, textAlign: "right" }}
            onBlur={commit}
            onSubmitEditing={commit}
          />
          <Text className="ml-1 text-sm text-text-secondary">g</Text>
        </>
      )}
      {props.canRemove && (
        <Pressable className="pl-3" hitSlop={8} testID="food-serving-remove" onPress={props.onRemove}>
          <Text className="text-lg text-text-secondary">×</Text>
        </Pressable>
      )}
    </View>
  );
}

export function FoodServingPanel(props: IProps): JSX.Element {
  const { serving } = props;
  const [isPickingMeal, setIsPickingMeal] = useState(false);
  return (
    <View testID="food-serving-panel" data-testid="food-serving-panel">
      <Text className="mb-2 text-xl font-bold">Serving size / Description</Text>
      {serving.items.map((item) => (
        <ItemRow
          key={item.key}
          item={item}
          canRemove={serving.items.length > 1}
          onGrams={(grams) => props.onGrams(item.key, grams)}
          onRemove={() => props.onRemove(item.key)}
        />
      ))}
      <View className="mt-4">
        <FoodNutrientsRow nutrients={FoodScanSteps_totals(serving)} />
      </View>
      <Text className="mt-4 mb-1.5 text-sm font-semibold">Description</Text>
      <FoodTextInput
        testID="food-serving-description"
        value={FoodScanSteps_description(serving)}
        onChangeText={props.onDescription}
        multiline={true}
        style={{ minHeight: 56, textAlignVertical: "top" }}
      />
      <View className="flex-row items-center mt-4">
        <Text className="flex-1 text-base">Meal</Text>
        <Pressable
          className="px-4 py-1.5 border border-blue-400 rounded-full"
          testID="food-serving-meal"
          data-testid="food-serving-meal"
          onPress={() => setIsPickingMeal(!isPickingMeal)}
        >
          <Text className="text-base text-text-link">{FoodLog_mealNames[props.meal]} ▾</Text>
        </Pressable>
      </View>
      {isPickingMeal && (
        <View className="mt-2">
          <FoodMealPicker
            meal={props.meal}
            onChange={(meal) => {
              props.onMeal(meal);
              setIsPickingMeal(false);
            }}
          />
        </View>
      )}
      <View className="flex-row items-center mt-4" style={{ gap: 10 }} testID="food-serving-share">
        {serving.photo != null && (
          <Image
            testID="food-serving-photo"
            source={{ uri: serving.photo }}
            className="rounded-lg"
            style={{ width: 48, height: 48 }}
            resizeMode="cover"
          />
        )}
        <View className="flex-1">
          <Text className={`text-base ${props.share.enabled ? "" : "text-text-secondary"}`}>Share with friends</Text>
          <Text className="text-xs text-text-secondary">{props.share.note}</Text>
        </View>
        <Switch
          value={serving.isShared === true && props.share.enabled}
          disabled={!props.share.enabled}
          onValueChange={props.onShare}
          testID="food-serving-share-switch"
        />
      </View>
      <View className="flex-row mt-5">
        <Button
          name="food-serving-add"
          kind="pill"
          className="flex-1"
          disabled={!FoodScanSteps_canAdd(serving)}
          onPress={props.onAdd}
        >
          Add
        </Button>
      </View>
    </View>
  );
}
