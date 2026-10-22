import { JSX } from "react";
import { View, Pressable, TextInput, TextInputProps } from "react-native";
import { Text } from "./primitives/text";
import { FoodLog_formatNumber, FoodLog_mealNames, FoodLog_meals, IFoodMeal, INutrients } from "../models/foodLog";
import { Tailwind_semantic } from "../utils/tailwindConfig";

export function FoodTextInput(props: TextInputProps & { testID?: string }): JSX.Element {
  const semantic = Tailwind_semantic();
  return (
    <TextInput
      {...props}
      data-testid={props.testID}
      placeholderTextColor={semantic.text.secondary}
      className={`px-3 py-2.5 border rounded-xl bg-form-inputbg border-form-inputstroke text-text-primary ${props.className ?? ""}`}
      style={[{ fontSize: 16, color: semantic.text.primary }, props.style]}
    />
  );
}

export function FoodMealPicker(props: { meal: IFoodMeal; onChange: (meal: IFoodMeal) => void }): JSX.Element {
  return (
    <View className="flex-row" style={{ gap: 6 }}>
      {FoodLog_meals.map((meal) => {
        const isActive = meal === props.meal;
        return (
          <Pressable
            key={meal}
            testID={`food-meal-pick-${meal}`}
            data-testid={`food-meal-pick-${meal}`}
            onPress={() => props.onChange(meal)}
            className={`flex-1 items-center py-2 rounded-full border ${
              isActive ? "border-button-primarybackground bg-background-subtle" : "border-border-neutral"
            }`}
          >
            <Text className={`text-sm ${isActive ? "text-text-link font-semibold" : "text-text-secondary"}`}>
              {FoodLog_mealNames[meal]}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function FoodNutrientsRow(props: { nutrients: INutrients }): JSX.Element {
  const n = props.nutrients;
  const cells: [string, string, string][] = [
    ["Calories", `${n.calories}`, "text-text-link"],
    ["Protein", `${FoodLog_formatNumber(n.protein)}g`, "text-text-purple"],
    ["Carbs", `${FoodLog_formatNumber(n.carbs)}g`, "text-text-success"],
    ["Fat", `${FoodLog_formatNumber(n.fat)}g`, "text-text-cardyellowsubtle"],
  ];
  return (
    <View className="flex-row p-3 rounded-2xl bg-background-subtle">
      {cells.map(([label, value, color]) => (
        <View key={label} className="items-center flex-1">
          <Text className={`text-lg font-bold ${color}`}>{value}</Text>
          <Text className="text-xs text-text-secondary">{label}</Text>
        </View>
      ))}
    </View>
  );
}

export function FoodChip(props: { title: string; isActive?: boolean; onPress: () => void }): JSX.Element {
  return (
    <Pressable
      onPress={props.onPress}
      className={`px-3 py-1.5 rounded-full border ${props.isActive ? "border-button-primarybackground" : "border-border-neutral"}`}
    >
      <Text className={`text-sm ${props.isActive ? "text-text-link" : "text-text-secondary"}`}>{props.title}</Text>
    </Pressable>
  );
}
