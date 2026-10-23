import { JSX } from "react";
import { Pressable, View } from "react-native";
import { Text } from "./primitives/text";
import { Button } from "./button";
import { IStats } from "../types";
import { FoodLog_add } from "../models/foodLog";
import { Stats_getCurrentBodyweight } from "../models/stats";
import { ISeasonFood, SeasonNudge_accept, SeasonNudge_entry, SeasonNudge_for } from "../models/seasonNudge";
import { FoodLogStore_newId, FoodLogStore_update, useFoodLog } from "../utils/foodLogStore";

function FoodRow(props: { food: ISeasonFood }): JSX.Element {
  const { food } = props;
  const testID = `season-nudge-food-${food.key}`;
  return (
    <Pressable
      testID={testID}
      data-testid={testID}
      onPress={() =>
        FoodLogStore_update((l) => FoodLog_add(l, SeasonNudge_entry(food, new Date(), FoodLogStore_newId())))
      }
      className="flex-row items-center px-3 py-2 mt-2 border rounded-xl border-border-neutral"
    >
      <View className="flex-1">
        <Text className="text-base font-semibold">{food.name}</Text>
        <Text className="text-sm text-text-secondary" numberOfLines={1}>
          {food.detail}
        </Text>
      </View>
      <Text className="ml-2 text-base font-semibold">+{food.nutrients.calories} kcal</Text>
    </Pressable>
  );
}

export function SeasonNudgeCard(props: { stats: IStats }): JSX.Element | null {
  const foodLog = useFoodLog();
  const nudge = SeasonNudge_for({ foodLog, latestWeight: Stats_getCurrentBodyweight(props.stats), now: new Date() });
  if (nudge == null) {
    return null;
  }
  return (
    <View className="px-4 pb-3" testID={`season-nudge-${nudge.kind}`} data-testid={`season-nudge-${nudge.kind}`}>
      <View className="p-3 rounded-2xl bg-background-subtle">
        <Text className="text-base">{nudge.text}</Text>
        {nudge.kind === "change" ? (
          <View className="flex-row mt-3">
            <Button
              name="season-nudge-ok"
              kind="pill"
              className="flex-1"
              onPress={() => FoodLogStore_update((l) => SeasonNudge_accept(l, nudge.season, nudge.goals))}
            >
              OK
            </Button>
          </View>
        ) : (
          nudge.foods.map((food) => <FoodRow key={food.key} food={food} />)
        )}
      </View>
    </View>
  );
}
