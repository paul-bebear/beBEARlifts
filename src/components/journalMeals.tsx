import { JSX, useState } from "react";
import { View } from "react-native";
import {
  FoodLog_addAll,
  FoodLog_dayTotals,
  FoodLog_dayKey,
  FoodLog_entriesFor,
  FoodLog_meals,
  IFoodMeal,
  IFoodProgressMode,
} from "../models/foodLog";
import { IFoodPhotoChoice } from "../models/foodAddFlow";
import { FoodDescribeEstimate_entries } from "../models/foodDescribeEstimate";
import { FoodMealForTime_pick } from "../models/foodMealForTime";
import { AiConsent_showFeatures } from "../models/aiConsent";
import { AiConsentStore } from "../utils/aiConsentClient";
import { FoodLogStore_newId, FoodLogStore_update, useFoodLog } from "../utils/foodLogStore";
import { navigateToModal } from "../navigation/navigationService";
import { useTrackedDispatch } from "../navigation/TrackedStateContext";
import { Thunk_pushScreen } from "../ducks/thunks";
import { FoodSummaryCard } from "./foodSummaryCard";
import { FoodMealCard } from "./foodMealCard";
import { FoodDescribePanel } from "./foodDescribePanel";
import { Button } from "./button";

interface IProps {
  day: string;
}

export function JournalMeals(props: IProps): JSX.Element {
  const { day } = props;
  const dispatch = useTrackedDispatch();
  const log = useFoodLog();
  const showAi = AiConsent_showFeatures(AiConsentStore.use());
  const [mode, setMode] = useState<IFoodProgressMode>("consumed");
  const [collapsed, setCollapsed] = useState<Partial<Record<IFoodMeal, boolean>>>({});
  const entries = FoodLog_entriesFor(log, day);

  const openAdd = (meal: IFoodMeal, addMode?: "photo"): void => {
    dispatch(Thunk_pushScreen("foodAdd", { day, meal, mode: addMode }));
  };

  const addDescribed = async (choices: IFoodPhotoChoice[]): Promise<void> => {
    const where = { day, meal: FoodMealForTime_pick(new Date()) };
    await FoodLogStore_update((l) =>
      FoodLog_addAll(l, FoodDescribeEstimate_entries(choices, where, FoodLogStore_newId, Date.now()))
    );
  };

  const clockMeal = FoodMealForTime_pick(new Date());
  return (
    <View testID="journal-meals" data-testid="journal-meals">
      <View className="px-4 pt-3">
        {showAi && (
          <FoodDescribePanel
            onAdd={addDescribed}
            onCamera={() => openAdd(clockMeal)}
            onPhoto={() => openAdd(clockMeal, "photo")}
          />
        )}
      </View>
      {entries.length === 0 && (
        <View className="px-4 pt-6 pb-2" testID="journal-meals-empty">
          <Button
            name="journal-log-meals"
            kind="pill"
            onPress={() => {
              const now = new Date();
              dispatch(Thunk_pushScreen("foodAdd", { day: FoodLog_dayKey(now), meal: FoodMealForTime_pick(now) }));
            }}
          >
            Log meals
          </Button>
        </View>
      )}
      <View className="pt-4">
        {FoodLog_meals.map((meal) => {
          const mealEntries = FoodLog_entriesFor(log, day, meal);
          return mealEntries.length === 0 ? null : (
            <FoodMealCard
              key={meal}
              meal={meal}
              entries={mealEntries}
              isExpanded={!collapsed[meal]}
              onToggle={() => setCollapsed({ ...collapsed, [meal]: !collapsed[meal] })}
              onAdd={() => openAdd(meal)}
              onEntryPress={(entry) => navigateToModal("foodEditModal", { entryId: entry.id })}
            />
          );
        })}
      </View>
      <FoodSummaryCard totals={FoodLog_dayTotals(log, day)} goals={log.goals} mode={mode} onModeChange={setMode} />
      <View className="h-6" />
    </View>
  );
}
