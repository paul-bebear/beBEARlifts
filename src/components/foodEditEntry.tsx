import { JSX } from "react";
import { View } from "react-native";
import { Text } from "./primitives/text";
import {
  FoodLog_remove,
  FoodLog_removeAll,
  FoodLog_sameDayCopies,
  FoodLog_setGrams,
  FoodLog_setMeal,
} from "../models/foodLog";
import { IFoodPick } from "../models/foodAddFlow";
import { FoodLogStore_update, useFoodLog } from "../utils/foodLogStore";
import { FoodAmountPanel } from "./foodAmountPanel";
import { Button } from "./button";
import { Dialog_confirm } from "../utils/dialog";

export function FoodEditEntry(props: { entryId: string; onClose: () => void }): JSX.Element {
  const log = useFoodLog();
  const entry = log.entries.find((e) => e.id === props.entryId);
  if (entry == null) {
    return <Text className="py-6 text-base text-center">This food is no longer in the log.</Text>;
  }
  const copies = FoodLog_sameDayCopies(log, entry.id);
  const pick: IFoodPick = {
    name: entry.name,
    brand: entry.brand,
    source: entry.source,
    per100g: entry.per100g,
    fixed: entry.per100g == null ? { grams: entry.grams, nutrients: entry.nutrients } : undefined,
  };
  return (
    <View>
      <FoodAmountPanel
        pick={pick}
        initialGrams={entry.grams ?? 100}
        meal={entry.meal}
        submitTitle="Save"
        onDelete={async () => {
          if (await Dialog_confirm(`Delete ${entry.name}?`)) {
            await FoodLogStore_update((l) => FoodLog_remove(l, entry.id));
            props.onClose();
          }
        }}
        onSubmit={async (grams, meal) => {
          await FoodLogStore_update((l) =>
            FoodLog_setMeal(FoodLog_setGrams(l, entry.id, grams), entry.id, meal ?? entry.meal)
          );
          props.onClose();
        }}
      />
      {copies.length > 1 && (
        <View className="mt-3">
          <Button
            name="food-delete-copies"
            kind="pill-outline"
            className="flex-1"
            onPress={async () => {
              if (await Dialog_confirm(`Delete all ${copies.length} of ${entry.name} from this day?`)) {
                await FoodLogStore_update((l) => FoodLog_removeAll(l, copies));
                props.onClose();
              }
            }}
          >
            {`Delete all ${copies.length} from this day`}
          </Button>
        </View>
      )}
    </View>
  );
}
