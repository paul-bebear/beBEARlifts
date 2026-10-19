import { JSX, useState } from "react";
import { View, Pressable } from "react-native";
import { Text } from "./primitives/text";
import { FoodLog_formatNumber, IFoodMeal } from "../models/foodLog";
import { FoodAddFlow_parseGrams } from "../models/foodAddFlow";
import { FoodBasket_hasPortion, FoodBasket_nutrients, FoodBasket_totals, IFoodBasketItem } from "../models/foodBasket";
import { FoodMealPicker, FoodPrimaryButton, FoodTextInput } from "./foodUi";
import { IconClose2 } from "./icons/iconClose2";
import { Tailwind_semantic } from "../utils/tailwindConfig";

interface IProps {
  basket: IFoodBasketItem[];
  meal: IFoodMeal;
  onMeal: (meal: IFoodMeal) => void;
  onGrams: (key: string, grams: number) => void;
  onRemove: (key: string) => void;
  onAddMore: () => void;
  onLog: () => void;
}

function TotalCell(props: { value: string; label: string; color: string }): JSX.Element {
  return (
    <View className="items-center flex-1">
      <Text className={`text-3xl font-bold ${props.color}`}>{props.value}</Text>
      <Text className="text-base text-text-secondary">{props.label}</Text>
    </View>
  );
}

function BasketRow(props: {
  item: IFoodBasketItem;
  onGrams: (grams: number) => void;
  onRemove: () => void;
}): JSX.Element {
  const { item } = props;
  const [gramsText, setGramsText] = useState(FoodLog_formatNumber(item.grams));
  const nutrients = FoodBasket_nutrients(item);
  const commit = (): void => {
    const grams = FoodAddFlow_parseGrams(gramsText);
    if (grams != null && grams !== item.grams) {
      props.onGrams(grams);
    }
  };
  return (
    <View className="py-3 border-b border-border-neutral" testID="food-basket-item" data-testid="food-basket-item">
      <View className="flex-row items-start">
        <View className="flex-1 pr-2">
          <Text className="text-lg font-semibold" numberOfLines={2}>
            {item.pick.name}
          </Text>
          <Text className="text-base text-text-secondary">{item.pick.brand ?? "Generic"}</Text>
        </View>
        <View className="items-end">
          <Text className="text-base">
            {nutrients.calories} Cal · {Math.round(nutrients.protein)} P
          </Text>
          {item.grams > 0 && (
            <Text className="text-base text-text-secondary">{FoodLog_formatNumber(item.grams)} g</Text>
          )}
        </View>
        <Pressable className="pl-3 pt-1" hitSlop={10} onPress={props.onRemove} testID="food-basket-remove">
          <IconClose2 size={16} color={Tailwind_semantic().icon.neutral} />
        </Pressable>
      </View>
      {FoodBasket_hasPortion(item) && (
        <View className="flex-row items-center px-4 py-2 mt-3 rounded-2xl bg-background-subtle">
          <Text className="flex-1 text-lg font-semibold">Portion</Text>
          <FoodTextInput
            testID="food-basket-grams"
            value={gramsText}
            onChangeText={setGramsText}
            onBlur={commit}
            onSubmitEditing={commit}
            keyboardType="decimal-pad"
            inputMode="decimal"
            selectTextOnFocus={true}
            style={{ width: 80, textAlign: "center", color: Tailwind_semantic().text.link }}
          />
          <View className="px-3 py-2.5 ml-2 rounded-xl bg-background-neutral">
            <Text className="text-base font-semibold text-text-link">g</Text>
          </View>
        </View>
      )}
    </View>
  );
}

export function FoodBasketPanel(props: IProps): JSX.Element {
  const totals = FoodBasket_totals(props.basket);
  return (
    <View testID="food-basket" data-testid="food-basket">
      <View className="flex-row pb-4 border-b border-border-neutral">
        <TotalCell value={`${totals.calories}`} label="Calories" color="text-text-link" />
        <TotalCell value={`${Math.round(totals.protein)}g`} label="Protein" color="text-text-purple" />
        <TotalCell value={`${Math.round(totals.carbs)}g`} label="Carbs" color="text-text-success" />
        <TotalCell value={`${Math.round(totals.fat)}g`} label="Fat" color="text-text-cardyellowsubtle" />
      </View>
      {props.basket.map((item) => (
        <BasketRow
          key={item.key}
          item={item}
          onGrams={(grams) => props.onGrams(item.key, grams)}
          onRemove={() => props.onRemove(item.key)}
        />
      ))}
      <Pressable className="items-center py-5" onPress={props.onAddMore} testID="food-basket-add-more">
        <Text className="text-lg font-semibold text-text-link">✎ Add foods</Text>
      </Pressable>
      <Text className="mb-1.5 text-sm font-semibold">Meal</Text>
      <FoodMealPicker meal={props.meal} onChange={props.onMeal} />
      <View className="flex-row mt-4">
        <FoodPrimaryButton
          testID="food-basket-log"
          title={`Log items (${props.basket.length})`}
          disabled={props.basket.length === 0}
          onPress={props.onLog}
        />
      </View>
    </View>
  );
}
