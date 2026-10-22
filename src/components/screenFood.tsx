import { JSX, useState } from "react";
import { View, Pressable } from "react-native";
import { Text } from "./primitives/text";
import { FoodLog_dayKey, FoodLog_dayLabel, FoodLog_shiftDay } from "../models/foodLog";
import { useNavOptions } from "../navigation/useNavOptions";
import { NavScreenContent } from "../navigation/NavScreenContent";
import { JournalMeals } from "./journalMeals";
import { IconChevronLeft, IconChevronRight } from "./icons/iconFoodUi";
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
  const today = FoodLog_dayKey(new Date());
  const [day, setDay] = useState(today);

  useNavOptions({ navTitle: <DayNavigator day={day} today={today} onChange={setDay} /> });

  return (
    <NavScreenContent>
      <JournalMeals day={day} />
    </NavScreenContent>
  );
}
