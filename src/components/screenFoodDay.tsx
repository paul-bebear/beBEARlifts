import { JSX, useState } from "react";
import { Pressable, View } from "react-native";
import { Text } from "./primitives/text";
import { Button } from "./button";
import { JournalMeals } from "./journalMeals";
import { IconChevronLeft, IconChevronRight } from "./icons/iconFoodUi";
import { useNavOptions } from "../navigation/useNavOptions";
import { NavScreenContent } from "../navigation/NavScreenContent";
import { useTrackedDispatch } from "../navigation/TrackedStateContext";
import { Thunk_pushScreen } from "../ducks/thunks";
import { FoodLog_dayKey } from "../models/foodLog";
import { FoodDayPage_build } from "../models/foodDayPage";
import { LateNightMeal_targets } from "../models/lateNightMeal";
import { LateNightMealChoice_pick } from "../utils/lateNightMealChoice";
import { useFoodLog } from "../utils/foodLogStore";
import { Tailwind_semantic } from "../utils/tailwindConfig";

function DaySwitcher(props: {
  label: string;
  onPrevious: () => void;
  onToday: () => void;
  onNext: () => void;
}): JSX.Element {
  const color = Tailwind_semantic().icon.neutral;
  return (
    <View className="flex-row items-center justify-center pt-2">
      <Pressable
        className="px-4 py-2"
        testID="food-day-prev"
        data-testid="food-day-prev"
        accessibilityRole="button"
        accessibilityLabel="Previous day"
        onPress={props.onPrevious}
      >
        <IconChevronLeft color={color} />
      </Pressable>
      <Pressable
        testID="food-day-label"
        data-testid="food-day-label"
        accessibilityRole="button"
        onPress={props.onToday}
      >
        <Text className="text-lg font-semibold text-center" style={{ minWidth: 170 }}>
          {props.label}
        </Text>
      </Pressable>
      <Pressable
        className="px-4 py-2"
        testID="food-day-next"
        data-testid="food-day-next"
        accessibilityRole="button"
        accessibilityLabel="Next day"
        onPress={props.onNext}
      >
        <IconChevronRight color={color} />
      </Pressable>
    </View>
  );
}

export function ScreenFoodDay(): JSX.Element {
  const dispatch = useTrackedDispatch();
  const log = useFoodLog();
  const [day, setDay] = useState(() => FoodLog_dayKey(new Date()));
  const page = FoodDayPage_build(log, day, Date.now());

  useNavOptions({ navTitle: "Food" });

  const logMeal = async (): Promise<void> => {
    const target = await LateNightMealChoice_pick(LateNightMeal_targets(Date.now(), day));
    if (target != null) {
      dispatch(Thunk_pushScreen("foodAdd", { day: target.day, meal: target.meal }));
    }
  };

  return (
    <NavScreenContent>
      <View testID="food-day" data-testid="food-day">
        <DaySwitcher
          label={page.label}
          onPrevious={() => setDay(page.previousDay)}
          onToday={() => setDay(FoodLog_dayKey(new Date()))}
          onNext={() => setDay(page.nextDay)}
        />
        <JournalMeals day={day} canAdd leadsWithSummary showsEmptyMeals micros={page.micros} />
        <View className="px-4 pb-8">
          <Button name="food-log-meal" testID="food-log-meal" kind="pill" onPress={logMeal}>
            Log a meal
          </Button>
        </View>
      </View>
    </NavScreenContent>
  );
}
