import { JSX, useState } from "react";
import { View } from "react-native";
import { FoodLog_dayTotals, FoodLog_entriesFor, FoodLog_meals, IFoodMeal, IFoodProgressMode } from "../models/foodLog";
import { useFoodLog } from "../utils/foodLogStore";
import { navigateToModal } from "../navigation/navigationService";
import { useTrackedDispatch } from "../navigation/TrackedStateContext";
import { Thunk_pushScreen } from "../ducks/thunks";
import { FoodSummaryCard } from "./foodSummaryCard";
import { FoodMealCard } from "./foodMealCard";

interface IProps {
  day: string;
  canAdd: boolean;
}

export function JournalMeals(props: IProps): JSX.Element {
  const { day, canAdd } = props;
  const dispatch = useTrackedDispatch();
  const log = useFoodLog();
  const [mode, setMode] = useState<IFoodProgressMode>("consumed");
  const [collapsed, setCollapsed] = useState<Partial<Record<IFoodMeal, boolean>>>({});
  const openAdd = (meal: IFoodMeal): void => {
    dispatch(Thunk_pushScreen("foodAdd", { day, meal }));
  };

  return (
    <View testID="journal-meals" data-testid="journal-meals">
      <View className="pt-2">
        {FoodLog_meals.map((meal) => {
          const mealEntries = FoodLog_entriesFor(log, day, meal);
          return mealEntries.length === 0 ? null : (
            <FoodMealCard
              key={meal}
              meal={meal}
              entries={mealEntries}
              isExpanded={!collapsed[meal]}
              onToggle={() => setCollapsed({ ...collapsed, [meal]: !collapsed[meal] })}
              onAdd={canAdd ? () => openAdd(meal) : undefined}
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
