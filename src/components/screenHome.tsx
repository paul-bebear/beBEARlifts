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
import { BearHouseView_mood } from "../models/bearHouseView";
import { useFoodLog } from "../utils/foodLogStore";
import { ProgramGoalStore } from "../utils/programGoalStore";
import { WeekScheduleStore } from "../utils/weekScheduleStore";
import { useFollowWeekSchedule } from "../utils/useFollowWeekSchedule";
import { WorkoutStart_open } from "../utils/workoutStart";
import { BearBoard_lines } from "../models/bearBoard";
import { HomeTargets_forBoard, HomeTargets_forHouse, IHomeCommand } from "../models/homeTargets";
import { Program_evaluate, Program_getProgramDay } from "../models/program";
import { QuickActions_isBagCheckOn } from "../models/quickActions";
import { TodayPill_dayName } from "../models/todayPill";
import { WeekSchedule_todayFor } from "../models/weekSchedule";
import { IHistoryRecord, IProgram } from "../types";

interface IProps {
  program: IProgram;
  progress?: IHistoryRecord;
}

function runHomeCommand(command: IHomeCommand, dispatch: IDispatch): void {
  switch (command.kind) {
    case "modal":
      navigateToModal(command.name);
      return;
    case "goalWizard":
      dispatch(Thunk_pushScreen("goalWizard", { mode: command.mode }, { tab: command.tab }));
      return;
    case "screen":
      dispatch(Thunk_pushScreen(command.screen, undefined, { tab: command.tab }));
      return;
    case "workout":
      WorkoutStart_open(command.action, dispatch);
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
  const house = useBearHouse(isOngoingProgress, state.level.tier.level);
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
        mood={BearHouseView_mood(isOngoingProgress, state.mood)}
        room={house.room}
        wall={house.wall}
        lines={lines}
        objects={house.objects}
        onBoardTarget={(target) => runHomeCommand(HomeTargets_forBoard(target, goalLog.current != null), dispatch)}
        onTarget={(target) => runHomeCommand(HomeTargets_forHouse(target, isBagCheckOn, isOngoingProgress), dispatch)}
      />
    </View>
  );
}
