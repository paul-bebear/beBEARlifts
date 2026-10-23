import { JSX } from "react";
import { View, Pressable } from "react-native";
import { Text } from "./primitives/text";
import { FoodLog_formatNumber, FoodLog_mealNames, FoodLog_sum, IFoodEntry, IFoodMeal } from "../models/foodLog";
import { IconChevronDown, IconPlusThin } from "./icons/iconFoodUi";
import { Tailwind_semantic } from "../utils/tailwindConfig";

interface IProps {
  meal: IFoodMeal;
  entries: IFoodEntry[];
  isExpanded: boolean;
  onToggle: () => void;
  onAdd?: () => void;
  onEntryPress: (entry: IFoodEntry) => void;
}

const calPillColor = "rgba(59, 130, 246, 0.22)";
const proteinPillColor = "rgba(139, 92, 246, 0.24)";

function Pill(props: { text: string; color: string }): JSX.Element {
  return (
    <View className="px-2.5 py-1 ml-1.5 rounded-full" style={{ backgroundColor: props.color }}>
      <Text className="text-sm">{props.text}</Text>
    </View>
  );
}

function EntryRow(props: { entry: IFoodEntry; onPress: () => void }): JSX.Element {
  const { entry } = props;
  const details = [entry.brand, entry.grams != null ? `${FoodLog_formatNumber(entry.grams)} g` : undefined]
    .filter(Boolean)
    .join(" · ");
  return (
    <Pressable
      className="flex-row items-center py-2.5 border-t border-border-neutral"
      testID="food-entry"
      data-testid="food-entry"
      onPress={props.onPress}
    >
      <View className="flex-1 pr-2">
        <Text className="text-base" numberOfLines={1}>
          {entry.name}
        </Text>
        <Text className="text-xs text-text-secondary" numberOfLines={1}>
          {details !== "" ? `${details} · ` : ""}
          {FoodLog_formatNumber(entry.nutrients.protein)} P · {FoodLog_formatNumber(entry.nutrients.carbs)} C ·{" "}
          {FoodLog_formatNumber(entry.nutrients.fat)} F
        </Text>
      </View>
      <Text className="text-base font-semibold">{entry.nutrients.calories}</Text>
      <Text className="ml-1 text-xs text-text-secondary">cal</Text>
    </Pressable>
  );
}

export function FoodMealCard(props: IProps): JSX.Element {
  const totals = FoodLog_sum(props.entries.map((e) => e.nutrients));
  const semantic = Tailwind_semantic();
  return (
    <View className="px-4 mx-4 mb-3 rounded-2xl bg-background-subtle" testID={`food-meal-${props.meal}`}>
      <View className="flex-row items-center py-3">
        <Pressable className="flex-row items-center flex-1" onPress={props.onToggle} hitSlop={8}>
          <View style={{ transform: [{ rotate: props.isExpanded ? "0deg" : "-90deg" }] }}>
            <IconChevronDown size={16} color={semantic.icon.neutral} />
          </View>
          <Text className="ml-2 text-xl font-semibold">{FoodLog_mealNames[props.meal]}</Text>
        </Pressable>
        <Pill text={`${totals.calories} Cal`} color={calPillColor} />
        <Pill text={`${Math.round(totals.protein)} P`} color={proteinPillColor} />
        {props.onAdd != null && (
          <Pressable
            className="pl-3"
            hitSlop={10}
            testID={`food-add-${props.meal}`}
            data-testid={`food-add-${props.meal}`}
            onPress={props.onAdd}
          >
            <IconPlusThin size={22} color={semantic.icon.blue} />
          </Pressable>
        )}
      </View>
      {props.isExpanded && props.entries.length > 0 && (
        <View className="pb-1">
          {props.entries.map((entry) => (
            <EntryRow key={entry.id} entry={entry} onPress={() => props.onEntryPress(entry)} />
          ))}
        </View>
      )}
    </View>
  );
}
