import { JSX, useMemo } from "react";
import { IDispatch } from "../ducks/types";
import { Thunk_pushScreen } from "../ducks/thunks";
import {
  DailyChecklist_build,
  DailyChecklist_greeting,
  DailyChecklist_toggleCheckIn,
  IChecklistItemKey,
} from "../models/dailyChecklist";
import { FoodLog_dayKey } from "../models/foodLog";
import { IStats, IUnit } from "../types";
import { ChecklistStore } from "../utils/checklistStore";
import { useFoodLog } from "../utils/foodLogStore";
import { ProgramGoalStore } from "../utils/programGoalStore";
import { DailyChecklistCard } from "./dailyChecklistCard";

export function HomeChecklist(props: { stats: IStats; units: IUnit; dispatch: IDispatch }): JSX.Element {
  const { stats, units, dispatch } = props;
  const foodLog = useFoodLog();
  const checklistLog = ChecklistStore.use();
  const goalLog = ProgramGoalStore.use();
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
        goalStartedAt: goalLog.current?.startedAt,
      }),
    [today, stats, foodLog, checklistLog, units, goalLog]
  );

  const onItemPress = (item: IChecklistItemKey): void => {
    if (item === "weight") {
      dispatch(Thunk_pushScreen("stats", undefined, { tab: "graphs" }));
    } else if (item === "food") {
      dispatch(Thunk_pushScreen("food", undefined, { tab: "food" }));
    } else {
      ChecklistStore.update((l) => DailyChecklist_toggleCheckIn(l, today));
    }
  };

  return (
    <DailyChecklistCard
      greeting={DailyChecklist_greeting(new Date().getHours())}
      checklist={checklist}
      isToday={true}
      onBackToToday={() => undefined}
      onItemPress={onItemPress}
    />
  );
}
