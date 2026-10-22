import { JSX, useState } from "react";
import { View } from "react-native";
import { Text } from "./primitives/text";
import { FoodLog_formatNumber, IFoodMeal } from "../models/foodLog";
import { FoodAddFlow_nutrientsFor, FoodAddFlow_parseGrams, IFoodPick } from "../models/foodAddFlow";
import { FoodChip, FoodMealPicker, FoodNutrientsRow, FoodTextInput } from "./foodUi";
import { Button } from "./button";

interface IProps {
  pick: IFoodPick;
  initialGrams: number;
  meal?: IFoodMeal;
  submitTitle: string;
  onSubmit: (grams: number, meal: IFoodMeal | undefined) => void;
  onDelete?: () => void;
  onBack?: () => void;
}

export function FoodAmountPanel(props: IProps): JSX.Element {
  const [gramsText, setGramsText] = useState(FoodLog_formatNumber(props.initialGrams));
  const [meal, setMeal] = useState(props.meal);
  const grams = FoodAddFlow_parseGrams(gramsText);
  const nutrients = FoodAddFlow_nutrientsFor(props.pick, grams ?? 0);
  const hasPortion = props.pick.per100g != null || props.pick.fixed?.grams != null;
  const serving = props.pick.servingGrams;
  const quickGrams = [serving, 50, 100, 150, 200].filter((g, i, all): g is number => g != null && all.indexOf(g) === i);

  return (
    <View testID="food-amount-panel" data-testid="food-amount-panel">
      <Text className="text-xl font-bold" numberOfLines={2}>
        {props.pick.name}
      </Text>
      {props.pick.brand != null && <Text className="text-sm text-text-secondary">{props.pick.brand}</Text>}
      {props.pick.per100g != null && (
        <Text className="mt-1 text-xs text-text-secondary">
          Per 100 g: {Math.round(props.pick.per100g.calories)} cal · {FoodLog_formatNumber(props.pick.per100g.protein)}{" "}
          P · {FoodLog_formatNumber(props.pick.per100g.carbs)} C · {FoodLog_formatNumber(props.pick.per100g.fat)} F
        </Text>
      )}
      {hasPortion && (
        <>
          <Text className="mt-4 mb-1.5 text-sm font-semibold">Amount (grams)</Text>
          <FoodTextInput
            testID="food-grams"
            value={gramsText}
            onChangeText={setGramsText}
            keyboardType="decimal-pad"
            inputMode="decimal"
            selectTextOnFocus={true}
          />
          <View className="flex-row flex-wrap mt-2" style={{ gap: 6 }}>
            {quickGrams.map((g) => (
              <FoodChip
                key={g}
                title={g === serving ? `1 serving (${FoodLog_formatNumber(g)} g)` : `${g} g`}
                isActive={grams === g}
                onPress={() => setGramsText(FoodLog_formatNumber(g))}
              />
            ))}
          </View>
        </>
      )}
      <View className="mt-4">
        <FoodNutrientsRow nutrients={nutrients} />
      </View>
      {meal != null && (
        <>
          <Text className="mt-4 mb-1.5 text-sm font-semibold">Meal</Text>
          <FoodMealPicker meal={meal} onChange={setMeal} />
        </>
      )}
      <View className="flex-row mt-5" style={{ gap: 8 }}>
        {props.onDelete != null && (
          <Button name="food-amount-panel-delete" kind="pill-danger" className="flex-1" onPress={props.onDelete}>
            Delete
          </Button>
        )}
        {props.onBack != null && (
          <Button name="food-amount-panel-back" kind="pill-outline" className="flex-1" onPress={props.onBack}>
            Back
          </Button>
        )}
        <Button
          name="food-submit"
          kind="pill"
          className="flex-1"
          disabled={hasPortion && grams == null}
          onPress={() => props.onSubmit(grams ?? props.initialGrams, meal)}
        >
          {props.submitTitle}
        </Button>
      </View>
    </View>
  );
}
