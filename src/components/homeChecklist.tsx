import { JSX, useMemo } from "react";
import { IDispatch } from "../ducks/types";
import { Thunk_pushScreen, Thunk_startProgramDay } from "../ducks/thunks";
import { DailyChecklist_build, IChecklistItemKey } from "../models/dailyChecklist";
import { FoodLog_dayKey } from "../models/foodLog";
import { MonthCalendar_workoutDays } from "../models/monthCalendar";
import { IStats, IUnit } from "../types";
import { useFoodLog } from "../utils/foodLogStore";
import { ProgramGoalStore } from "../utils/programGoalStore";
import { DailyChecklistCard } from "./dailyChecklistCard";

interface IProps {
  stats: IStats;
  units: IUnit;
  dispatch: IDispatch;
  history?: { startTime: number }[];
  isOngoing?: boolean;
  onTrain: () => void;
  startWeekFromMonday?: boolean;
}

export function HomeChecklist(props: IProps): JSX.Element {
  const { stats, units, dispatch, history, isOngoing, onTrain, startWeekFromMonday } = props;
  const foodLog = useFoodLog();
  const goalLog = ProgramGoalStore.use();
  const today = FoodLog_dayKey(new Date());
  const checklist = useMemo(
    () =>
      DailyChecklist_build({
        day: today,
        today,
        stats,
        foodLog,
        units,
        workoutDays: MonthCalendar_workoutDays(history ?? []),
        goalStartedAt: goalLog.current?.startedAt,
        startWeekFromMonday,
      }),
    [today, stats, foodLog, units, history, goalLog, startWeekFromMonday]
  );

  const onItemPress = (item: IChecklistItemKey): void => {
    if (item === "weight") {
      dispatch(Thunk_pushScreen("stats", undefined, { tab: "graphs" }));
    } else if (item === "food") {
      dispatch(Thunk_pushScreen("food", undefined, { tab: "food" }));
    } else if (isOngoing) {
      dispatch(Thunk_startProgramDay());
    } else {
      onTrain();
    }
  };

  return <DailyChecklistCard checklist={checklist} onItemPress={onItemPress} />;
}
