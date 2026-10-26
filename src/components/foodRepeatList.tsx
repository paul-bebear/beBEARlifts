import { JSX, useRef, useState } from "react";
import { Pressable, View } from "react-native";
import { FoodLog_mealNames } from "../models/foodLog";
import {
  FoodRepeat_begin,
  FoodRepeat_copy,
  FoodRepeat_details,
  FoodRepeat_fallback,
  FoodRepeat_groups,
  FoodRepeat_initial,
  FoodRepeat_offer,
  FoodRepeat_retry,
  FoodRepeat_selected,
  FoodRepeat_showDay,
  FoodRepeat_toggle,
} from "../models/foodRepeat";
import { FoodLogStore_newId, FoodLogStore_update, useFoodLog } from "../utils/foodLogStore";
import { Button } from "./button";
import { Text } from "./primitives/text";

export function FoodRepeatList(props: { day: string; onBack: () => void; onCopied: () => void }): JSX.Element {
  const log = useFoodLog();
  const [state, setState] = useState(() => FoodRepeat_initial(props.day));
  const pending = useRef(state);
  const groups = FoodRepeat_groups(log, state.day);
  const fallback = FoodRepeat_fallback(log, props.day);
  const count = FoodRepeat_selected(log, state).length;

  const save = async (): Promise<void> => {
    const next = FoodRepeat_begin(log, pending.current);
    if (next == null) {
      return;
    }
    pending.current = next;
    setState(next);
    try {
      await FoodLogStore_update((current) => FoodRepeat_copy(current, next, Date.now(), FoodLogStore_newId));
      props.onCopied();
    } catch {
      pending.current = FoodRepeat_retry(next);
      setState(pending.current);
    }
  };

  return (
    <View testID="food-repeat-list" className="py-4">
      <Text className="mb-4 text-lg font-semibold">Same as yesterday</Text>
      {groups.length === 0 && <Text className="text-base">Nothing logged yesterday</Text>}
      {groups.length === 0 && fallback != null && (
        <Pressable
          testID="food-repeat-fallback"
          className="py-3"
          onPress={() => {
            pending.current = FoodRepeat_showDay(pending.current, fallback);
            setState(pending.current);
          }}
        >
          <Text className="text-base text-text-link">{FoodRepeat_offer(fallback)}</Text>
        </Pressable>
      )}
      {groups.map((group) => (
        <View key={group.meal} className="mb-4">
          <Text className="mb-2 text-base font-semibold">{FoodLog_mealNames[group.meal]}</Text>
          {group.entries.map((entry) => (
            <Pressable
              key={entry.id}
              testID={`food-repeat-${entry.id}`}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: state.selected.includes(entry.id), disabled: state.isSaving }}
              disabled={state.isSaving}
              className="flex-row items-center py-3"
              style={{ gap: 12 }}
              onPress={() => {
                pending.current = FoodRepeat_toggle(pending.current, entry.id);
                setState(pending.current);
              }}
            >
              <Text className="text-xl text-text-link">{state.selected.includes(entry.id) ? "☑" : "☐"}</Text>
              <View className="flex-1">
                <Text className="text-base">{entry.name}</Text>
                <Text className="text-sm text-text-secondary">{FoodRepeat_details(entry)}</Text>
              </View>
            </Pressable>
          ))}
        </View>
      ))}
      <Button name="food-repeat-log" kind="pill" disabled={count === 0 || state.isSaving} onPress={save}>
        {`Log ${count} items`}
      </Button>
      <Button
        name="food-repeat-back"
        kind="pill-outline"
        className="mt-3"
        disabled={state.isSaving}
        onPress={props.onBack}
      >
        Back
      </Button>
    </View>
  );
}
