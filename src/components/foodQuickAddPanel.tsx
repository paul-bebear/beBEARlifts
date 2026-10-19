import { JSX, useState } from "react";
import { View } from "react-native";
import { Text } from "./primitives/text";
import { IFoodMeal, INutrients } from "../models/foodLog";
import { FoodMealPicker, FoodPrimaryButton, FoodTextInput } from "./foodUi";

interface IProps {
  meal: IFoodMeal;
  onSubmit: (name: string, nutrients: INutrients, meal: IFoodMeal) => void;
  onBack: () => void;
}

const fields: { key: keyof INutrients; label: string }[] = [
  { key: "calories", label: "Calories" },
  { key: "protein", label: "Protein (g)" },
  { key: "carbs", label: "Carbs (g)" },
  { key: "fat", label: "Fat (g)" },
];

function toNumber(text: string): number {
  const value = Number(text.replace(",", "."));
  return isFinite(value) && value >= 0 ? value : 0;
}

export function FoodQuickAddPanel(props: IProps): JSX.Element {
  const [name, setName] = useState("");
  const [values, setValues] = useState<Record<keyof INutrients, string>>({
    calories: "",
    protein: "",
    carbs: "",
    fat: "",
  });
  const [meal, setMeal] = useState(props.meal);
  const nutrients: INutrients = {
    calories: Math.round(toNumber(values.calories)),
    protein: toNumber(values.protein),
    carbs: toNumber(values.carbs),
    fat: toNumber(values.fat),
  };
  return (
    <View testID="food-quick-add-panel" data-testid="food-quick-add-panel">
      <Text className="mb-1.5 text-sm font-semibold">Name</Text>
      <FoodTextInput testID="food-quick-name" value={name} onChangeText={setName} placeholder="e.g. Chicken wrap" />
      <View className="flex-row flex-wrap mt-3" style={{ gap: 8 }}>
        {fields.map((f) => (
          <View key={f.key} style={{ width: "48%" }}>
            <Text className="mb-1.5 text-sm font-semibold">{f.label}</Text>
            <FoodTextInput
              testID={`food-quick-${f.key}`}
              value={values[f.key]}
              onChangeText={(text) => setValues({ ...values, [f.key]: text })}
              keyboardType="decimal-pad"
              inputMode="decimal"
              placeholder="0"
            />
          </View>
        ))}
      </View>
      <Text className="mt-4 mb-1.5 text-sm font-semibold">Meal</Text>
      <FoodMealPicker meal={meal} onChange={setMeal} />
      <View className="flex-row mt-5" style={{ gap: 8 }}>
        <FoodPrimaryButton title="Back" kind="outline" onPress={props.onBack} />
        <FoodPrimaryButton
          testID="food-quick-submit"
          title="Add"
          disabled={nutrients.calories <= 0}
          onPress={() => props.onSubmit(name, nutrients, meal)}
        />
      </View>
    </View>
  );
}
