import { JSX, useState } from "react";
import { View, Pressable } from "react-native";
import { Text } from "./primitives/text";
import {
  FoodLog_formatNumber,
  FoodLog_formatRange,
  FoodLog_progress,
  IFoodGoals,
  IFoodProgressMode,
  IFoodRange,
  INutrients,
} from "../models/foodLog";
import { IconChevronDown } from "./icons/iconFoodUi";
import { Tailwind_semantic } from "../utils/tailwindConfig";

interface IProps {
  totals: INutrients;
  goals: IFoodGoals;
  mode: IFoodProgressMode;
  onModeChange: (mode: IFoodProgressMode) => void;
}

const macros: { key: "protein" | "carbs" | "fat"; label: string; barClass: string }[] = [
  { key: "protein", label: "Protein", barClass: "bg-purple-400" },
  { key: "carbs", label: "Carbs", barClass: "bg-green-400" },
  { key: "fat", label: "Fat", barClass: "bg-yellow-400" },
];

function Bar(props: { fraction: number; barClass: string; height: number }): JSX.Element {
  return (
    <View className="w-full overflow-hidden rounded-full bg-background-neutral" style={{ height: props.height }}>
      <View className={`h-full rounded-full ${props.barClass}`} style={{ width: `${props.fraction * 100}%` }} />
    </View>
  );
}

function ModeToggle(props: { mode: IFoodProgressMode; onChange: (mode: IFoodProgressMode) => void }): JSX.Element {
  const options: { mode: IFoodProgressMode; label: string }[] = [
    { mode: "consumed", label: "Consumed" },
    { mode: "remaining", label: "Remaining" },
  ];
  return (
    <View className="flex-row self-start p-0.5 rounded-full bg-background-neutral">
      {options.map((o) => {
        const isActive = o.mode === props.mode;
        return (
          <Pressable
            key={o.mode}
            testID={`food-mode-${o.mode}`}
            data-testid={`food-mode-${o.mode}`}
            onPress={() => props.onChange(o.mode)}
            className={`px-3 py-1 rounded-full ${isActive ? "bg-background-default" : ""}`}
          >
            <Text className={`text-sm ${isActive ? "text-text-link font-semibold" : "text-text-secondary"}`}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function BreakdownRow(props: { label: string; value: number; range: IFoodRange; unit: string }): JSX.Element {
  const left = Math.max(0, props.range.min - props.value);
  return (
    <View className="flex-row items-center justify-between py-1.5">
      <Text className="text-sm text-text-secondary">{props.label}</Text>
      <Text className="text-sm">
        {FoodLog_formatNumber(props.value)} / {FoodLog_formatRange(props.range, props.unit)}
        <Text className="text-sm text-text-secondary">
          {left > 0 ? `  ·  ${FoodLog_formatNumber(left)}${props.unit} to go` : "  ·  done"}
        </Text>
      </Text>
    </View>
  );
}

export function FoodSummaryCard(props: IProps): JSX.Element {
  const [isExpanded, setIsExpanded] = useState(false);
  const calories = FoodLog_progress(props.totals.calories, props.goals.calories, props.mode);
  return (
    <View className="p-4 mx-4 mt-2 rounded-2xl bg-background-subtle" testID="food-summary" data-testid="food-summary">
      <ModeToggle mode={props.mode} onChange={props.onModeChange} />
      <View className="flex-row items-end mt-3">
        <Text className="font-bold text-text-primary" style={{ fontSize: 56, lineHeight: 62 }}>
          {Math.round(calories.value)}
        </Text>
        <Text className="pb-2 ml-2 text-lg text-text-secondary">
          {props.mode === "consumed"
            ? `/ ${FoodLog_formatRange(props.goals.calories, " cal")}`
            : `cal left${calories.isOver ? " · over" : ""}`}
        </Text>
      </View>
      <View className="mt-3">
        <Bar fraction={calories.fraction} barClass={calories.isOver ? "bg-red-400" : "bg-blue-400"} height={18} />
      </View>
      <View className="flex-row mt-5" style={{ gap: 12 }}>
        {macros.map((m) => {
          const progress = FoodLog_progress(props.totals[m.key], props.goals[m.key], props.mode);
          return (
            <View key={m.key} className="flex-1">
              <Text className="mb-1.5 text-base">{m.label}</Text>
              <Bar fraction={progress.fraction} barClass={m.barClass} height={6} />
              <Text className="mt-1.5 text-xs" numberOfLines={1}>
                <Text className="text-xs font-bold">{Math.round(progress.value)}</Text>
                <Text className="text-xs text-text-secondary">
                  {props.mode === "consumed" ? ` / ${FoodLog_formatRange(props.goals[m.key], "g")}` : "g left"}
                </Text>
              </Text>
            </View>
          );
        })}
      </View>
      <Pressable
        className="flex-row items-center justify-center pt-4"
        testID="food-full-breakdown"
        data-testid="food-full-breakdown"
        onPress={() => setIsExpanded(!isExpanded)}
      >
        <Text className="text-base font-semibold">Full Breakdown</Text>
        <View style={{ transform: [{ rotate: isExpanded ? "180deg" : "0deg" }] }}>
          <IconChevronDown size={16} color={Tailwind_semantic().icon.neutral} />
        </View>
      </Pressable>
      {isExpanded && (
        <View className="pt-2 mt-2 border-t border-border-neutral">
          <BreakdownRow label="Calories" value={props.totals.calories} range={props.goals.calories} unit=" cal" />
          <BreakdownRow label="Protein" value={props.totals.protein} range={props.goals.protein} unit="g" />
          <BreakdownRow label="Carbs" value={props.totals.carbs} range={props.goals.carbs} unit="g" />
          <BreakdownRow label="Fat" value={props.totals.fat} range={props.goals.fat} unit="g" />
        </View>
      )}
    </View>
  );
}
