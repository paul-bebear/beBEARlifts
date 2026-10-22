import { JSX, useMemo } from "react";
import { IDispatch } from "../ducks/types";
import { Thunk_pushScreen, Thunk_startProgramDay } from "../ducks/thunks";
import { DailyChecklist_build, IChecklistItemKey } from "../models/dailyChecklist";
import { FoodLog_dayKey } from "../models/foodLog";
import { IStats, IUnit } from "../types";
import { ChecklistStore } from "../utils/checklistStore";
import { useFoodLog } from "../utils/foodLogStore";
import { untrack, useTrackedState } from "../navigation/TrackedStateContext";
import { DailyChecklistCard } from "./dailyChecklistCard";

export function HomeChecklist(props: { stats: IStats; units: IUnit; dispatch: IDispatch }): JSX.Element {
  const { stats, units, dispatch } = props;
  const foodLog = useFoodLog();
  const checklistLog = ChecklistStore.use();
  const state = useTrackedState();
  const history = untrack(state.storage.history);
  const startWeekFromMonday = state.storage.settings.startWeekFromMonday;
  const today = FoodLog_dayKey(new Date());
  const checklist = useMemo(
    () =>
      DailyChecklist_build({
        day: today,
        today,
        stats,
        foodLog,
        log: checklistLog,
        units,
        history,
        startWeekFromMonday,
      }),
    [today, stats, foodLog, checklistLog, units, history, startWeekFromMonday]
  );

  const onItemPress = (item: IChecklistItemKey): void => {
    if (item === "weight") {
      dispatch(Thunk_pushScreen("stats", undefined, { tab: "graphs" }));
    } else if (item === "food") {
      dispatch(Thunk_pushScreen("food", undefined, { tab: "food" }));
    } else {
      dispatch(Thunk_startProgramDay());
    }
  };

  return (
    <DailyChecklistCard
      checklist={checklist}
      isToday={true}
      onBackToToday={() => undefined}
      onItemPress={onItemPress}
    />
  );
}
