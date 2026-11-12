import { JSX, useState } from "react";
import { View } from "react-native";
import { FoodLog_dayTotals, IFoodMeal, IFoodProgressMode } from "../models/foodLog";
import { FoodDayPage_meals } from "../models/foodDayPage";
import { useFoodLog } from "../utils/foodLogStore";
import { navigateToModal } from "../navigation/navigationService";
import { useTrackedDispatch } from "../navigation/TrackedStateContext";
import { Thunk_pushScreen } from "../ducks/thunks";
import { FoodSummaryCard } from "./foodSummaryCard";
import { FoodSummaryPager } from "./foodSummaryPager";
import { IMicroTotals } from "../models/foodMicroTotals";
import { FoodMealCard } from "./foodMealCard";

interface IProps {
  day: string;
  canAdd: boolean;
  leadsWithSummary?: boolean;
  showsEmptyMeals?: boolean;
  micros?: IMicroTotals;
}

export function JournalMeals(props: IProps): JSX.Element {
  const { day, canAdd, leadsWithSummary, showsEmptyMeals, micros } = props;
  const dispatch = useTrackedDispatch();
  const log = useFoodLog();
  const [mode, setMode] = useState<IFoodProgressMode>("consumed");
  const [collapsed, setCollapsed] = useState<Partial<Record<IFoodMeal, boolean>>>({});
  const openAdd = (meal: IFoodMeal): void => {
    dispatch(Thunk_pushScreen("foodAdd", { day, meal }));
  };
  const summary =
    micros != null ? (
      <FoodSummaryPager
        totals={FoodLog_dayTotals(log, day)}
        goals={log.goals}
        micros={micros}
        mode={mode}
        onModeChange={setMode}
      />
    ) : (
      <FoodSummaryCard
        totals={FoodLog_dayTotals(log, day)}
        goals={log.goals}
        mode={mode}
        onModeChange={setMode}
        isOpenAtStart={leadsWithSummary}
      />
    );

  return (
    <View testID="journal-meals" data-testid="journal-meals">
      {leadsWithSummary && summary}
      <View className="pt-2">
        {FoodDayPage_meals(log, day, showsEmptyMeals === true).map(({ meal, entries }) => (
          <FoodMealCard
            key={meal}
            meal={meal}
            entries={entries}
            isExpanded={!collapsed[meal]}
            onToggle={() => setCollapsed({ ...collapsed, [meal]: !collapsed[meal] })}
            onAdd={canAdd ? () => openAdd(meal) : undefined}
            onEntryPress={(entry) => navigateToModal("foodEditModal", { entryId: entry.id })}
          />
        ))}
      </View>
      {!leadsWithSummary && summary}
      <View className="h-6" />
    </View>
  );
}
