import { JSX, useState } from "react";
import { View, Pressable } from "react-native";
import { Text } from "./primitives/text";
import {
  FoodLog_copyDay,
  FoodLog_dayKey,
  FoodLog_dayLabel,
  FoodLog_dayTotals,
  FoodLog_entriesFor,
  FoodLog_mealForHour,
  FoodLog_meals,
  FoodLog_shiftDay,
  IFoodMeal,
  IFoodProgressMode,
} from "../models/foodLog";
import { FoodLogStore_newId, FoodLogStore_update, useFoodLog } from "../utils/foodLogStore";
import { useNavOptions } from "../navigation/useNavOptions";
import { navigateToModal } from "../navigation/navigationService";
import { NavScreenContent } from "../navigation/NavScreenContent";
import { FoodSummaryCard } from "./foodSummaryCard";
import { FoodMealCard } from "./foodMealCard";
import { FoodSearchBar } from "./foodSearchBar";
import { IconChevronLeft, IconChevronRight, IconCopyDay } from "./icons/iconFoodUi";
import { IconCog2 } from "./icons/iconCog2";
import { Dialog_alert, Dialog_confirm } from "../utils/dialog";
import { Tailwind_semantic } from "../utils/tailwindConfig";

function DayNavigator(props: { day: string; today: string; onChange: (day: string) => void }): JSX.Element {
  const color = Tailwind_semantic().icon.neutral;
  return (
    <View className="flex-row items-center justify-center">
      <Pressable
        className="px-3 py-1"
        testID="food-day-prev"
        onPress={() => props.onChange(FoodLog_shiftDay(props.day, -1))}
      >
        <IconChevronLeft color={color} />
      </Pressable>
      <Pressable onPress={() => props.onChange(props.today)} testID="food-day-label">
        <Text className="text-lg text-center" style={{ minWidth: 150 }}>
          {FoodLog_dayLabel(props.day, props.today)}
        </Text>
      </Pressable>
      <Pressable
        className="px-3 py-1"
        testID="food-day-next"
        onPress={() => props.onChange(FoodLog_shiftDay(props.day, 1))}
      >
        <IconChevronRight color={color} />
      </Pressable>
    </View>
  );
}

export function ScreenFood(): JSX.Element {
  const log = useFoodLog();
  const today = FoodLog_dayKey(new Date());
  const [day, setDay] = useState(today);
  const [mode, setMode] = useState<IFoodProgressMode>("consumed");
  const [collapsed, setCollapsed] = useState<Partial<Record<IFoodMeal, boolean>>>({});
  const totals = FoodLog_dayTotals(log, day);
  const defaultMeal = FoodLog_mealForHour(new Date().getHours());

  useNavOptions({ navTitle: <DayNavigator day={day} today={today} onChange={setDay} /> });

  const openAdd = (addMode: "search" | "barcode" | "photo", meal: IFoodMeal): void => {
    navigateToModal("foodAddModal", { mode: addMode, day, meal });
  };

  const copyPreviousDay = async (): Promise<void> => {
    const previous = FoodLog_shiftDay(day, -1);
    const count = FoodLog_entriesFor(log, previous).length;
    if (count === 0) {
      Dialog_alert(`Nothing is logged on ${FoodLog_dayLabel(previous, today)}.`);
      return;
    }
    if (
      await Dialog_confirm(`Copy ${count} food${count === 1 ? "" : "s"} from ${FoodLog_dayLabel(previous, today)}?`)
    ) {
      await FoodLogStore_update((l) => FoodLog_copyDay(l, previous, day, FoodLogStore_newId, Date.now()));
    }
  };

  const iconColor = Tailwind_semantic().icon.neutral;
  return (
    <NavScreenContent
      footer={
        <FoodSearchBar
          onSearch={() => openAdd("search", defaultMeal)}
          onBarcode={() => openAdd("barcode", defaultMeal)}
          onPhoto={() => openAdd("photo", defaultMeal)}
        />
      }
    >
      <FoodSummaryCard totals={totals} goals={log.goals} mode={mode} onModeChange={setMode} />
      <View className="flex-row items-center px-4 pt-6 pb-3">
        <Text className="flex-1 text-3xl font-bold">Food Log</Text>
        <Pressable
          className="p-2"
          testID="food-goals"
          data-testid="food-goals"
          onPress={() => navigateToModal("foodGoalsModal")}
        >
          <IconCog2 color={iconColor} size={22} />
        </Pressable>
        <Pressable className="p-2 ml-1" testID="food-copy-day" data-testid="food-copy-day" onPress={copyPreviousDay}>
          <IconCopyDay color={iconColor} size={22} />
        </Pressable>
      </View>
      {FoodLog_meals.map((meal) => (
        <FoodMealCard
          key={meal}
          meal={meal}
          entries={FoodLog_entriesFor(log, day, meal)}
          isExpanded={!collapsed[meal]}
          onToggle={() => setCollapsed({ ...collapsed, [meal]: !collapsed[meal] })}
          onAdd={() => openAdd("search", meal)}
          onEntryPress={(entry) => navigateToModal("foodAddModal", { mode: "edit", entryId: entry.id })}
        />
      ))}
      <View className="h-4" />
    </NavScreenContent>
  );
}
