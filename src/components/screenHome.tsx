import { JSX, useMemo } from "react";
import { View } from "react-native";
import { untrack, useTrackedDispatch, useTrackedState } from "../navigation/TrackedStateContext";
import { useNavOptions } from "../navigation/useNavOptions";
import { navigateToModal } from "../navigation/navigationService";
import { Thunk_pushScreen } from "../ducks/thunks";
import { IDispatch } from "../ducks/types";
import { BearHouseScene } from "./bearHouseScene";
import { useBear } from "../utils/useBear";
import { useBearHouse } from "../utils/useBearHouse";
import { useFoodLog } from "../utils/foodLogStore";
import { ProgramGoalStore } from "../utils/programGoalStore";
import { WeekScheduleStore } from "../utils/weekScheduleStore";
import { useFollowWeekSchedule } from "../utils/useFollowWeekSchedule";
import { WorkoutStart_open } from "../utils/workoutStart";
import { BearBoard_lines, IBearBoardTarget } from "../models/bearBoard";
import { IBearHouseTarget } from "../models/bearHouse";
import { Program_evaluate, Program_getProgramDay } from "../models/program";
import { QuickActions_isBagCheckOn, QuickActions_workout } from "../models/quickActions";
import { TodayPill_dayName } from "../models/todayPill";
import { WeekSchedule_todayFor } from "../models/weekSchedule";
import { IHistoryRecord, IProgram } from "../types";

interface IProps {
  program: IProgram;
  progress?: IHistoryRecord;
}

function openBoardTarget(target: IBearBoardTarget, dispatch: IDispatch, hasGoal: boolean): void {
  if (target === "goal") {
    dispatch(Thunk_pushScreen("goalWizard", { mode: hasGoal ? "pace" : "goal" }, { tab: "graphs" }));
    return;
  }
  if (target === "streak") {
    dispatch(Thunk_pushScreen("streak"));
    return;
  }
  navigateToModal(target === "plus" ? "plusSheetModal" : "bearPanelModal");
}

function openHouseTarget(
  target: IBearHouseTarget,
  dispatch: IDispatch,
  isBagCheckOn: boolean,
  isOngoingProgress: boolean
): void {
  switch (target.kind) {
    case "plus":
      navigateToModal("plusSheetModal");
      return;
    case "door":
      WorkoutStart_open(QuickActions_workout({ isOngoingProgress, isBagCheckOn }).action, dispatch);
      return;
    case "bearPanel":
      navigateToModal("bearPanelModal");
      return;
    case "journal":
      dispatch(Thunk_pushScreen("food", undefined, { tab: "food" }));
      return;
    case "monthCalendar":
      navigateToModal("monthCalendarModal");
      return;
    case "screen":
      dispatch(Thunk_pushScreen(target.screen, undefined, target.tab != null ? { tab: target.tab } : undefined));
      return;
    case "phone":
      navigateToModal("phoneSheetModal");
      return;
  }
}

export function ScreenHome(props: IProps): JSX.Element {
  const dispatch = useTrackedDispatch();
  const tracked = useTrackedState();
  const history = untrack(tracked.storage.history);
  const stats = untrack(tracked.storage.stats);
  const settings = untrack(tracked.storage.settings);
  const { state } = useBear();
  const isOngoingProgress = props.progress != null;
  const house = useBearHouse(isOngoingProgress);
  const foodLog = useFoodLog();
  const goalLog = ProgramGoalStore.use();
  const schedule = WeekScheduleStore.use();
  const program = useMemo(() => Program_evaluate(props.program, settings), [props.program, settings]);
  useFollowWeekSchedule(program, history, isOngoingProgress, dispatch);
  const now = Date.now();
  const dayName = TodayPill_dayName(
    WeekSchedule_todayFor(schedule, program, now),
    Program_getProgramDay(program, program.nextDay)?.name
  );
  const lines = useMemo(
    () =>
      BearBoard_lines({
        history,
        stats,
        foodLog,
        units: settings.units,
        dayName,
        goal: goalLog.current,
        startWeekFromMonday: settings.startWeekFromMonday,
        level: state.level,
        countedKg: state.countedKg,
        workouts: state.workouts,
        now,
      }),
    [history, stats, foodLog, settings, dayName, goalLog, state]
  );
  const isBagCheckOn = QuickActions_isBagCheckOn(settings.skipBagCheck, tracked.storage.currentProgramId);
  useNavOptions({ navHidden: true });
  return (
    <View style={{ flex: 1 }} testID="home" data-testid="home">
      <BearHouseScene
        state={state}
        room={house.room}
        wall={house.wall}
        lines={lines}
        objects={house.objects}
        onBoardTarget={(target) => openBoardTarget(target, dispatch, goalLog.current != null)}
        onTarget={(target) => openHouseTarget(target, dispatch, isBagCheckOn, isOngoingProgress)}
      />
    </View>
  );
}
