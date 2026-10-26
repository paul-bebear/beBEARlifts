import { JSX, useMemo } from "react";
import { Pressable, View } from "react-native";
import { untrack, useTrackedDispatch, useTrackedState } from "../navigation/TrackedStateContext";
import { NavScreenContent } from "../navigation/NavScreenContent";
import { useNavOptions } from "../navigation/useNavOptions";
import { navigateToModal } from "../navigation/navigationService";
import { Thunk_pushScreen } from "../ducks/thunks";
import { Tailwind_semantic } from "../utils/tailwindConfig";
import { IconCog2 } from "./icons/iconCog2";
import { MyBearSections } from "./screenProgressDashboard";
import { BearScene } from "./bearScene";
import { SeasonNudgeCard } from "./seasonNudgeCard";
import { useBear } from "../utils/useBear";
import { useFoodLog } from "../utils/foodLogStore";
import { ProgramGoalStore } from "../utils/programGoalStore";
import { WeekScheduleStore } from "../utils/weekScheduleStore";
import { useFollowWeekSchedule } from "../utils/useFollowWeekSchedule";
import { BearBoard_lines, IBearBoardTarget } from "../models/bearBoard";
import { Program_evaluate, Program_getProgramDay } from "../models/program";
import { TodayPill_dayName } from "../models/todayPill";
import { WeekSchedule_todayFor } from "../models/weekSchedule";
import { IHistoryRecord, IProgram } from "../types";

interface IProps {
  program: IProgram;
  progress?: IHistoryRecord;
}

function openBoardTarget(target: IBearBoardTarget): void {
  navigateToModal(target === "plus" ? "plusSheetModal" : "bearPanelModal");
}

export function ScreenHome(props: IProps): JSX.Element {
  const dispatch = useTrackedDispatch();
  const tracked = useTrackedState();
  const history = untrack(tracked.storage.history);
  const stats = untrack(tracked.storage.stats);
  const settings = untrack(tracked.storage.settings);
  const { state } = useBear();
  const foodLog = useFoodLog();
  const goalLog = ProgramGoalStore.use();
  const schedule = WeekScheduleStore.use();
  const program = useMemo(() => Program_evaluate(props.program, settings), [props.program, settings]);
  useFollowWeekSchedule(program, history, props.progress != null, dispatch);
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
        goalStartedAt: goalLog.current?.startedAt,
        startWeekFromMonday: settings.startWeekFromMonday,
        level: state.level,
        countedKg: state.countedKg,
        now,
      }),
    [history, stats, foodLog, settings, dayName, goalLog, state]
  );
  useNavOptions({
    navTitle: "My bear",
    navRightButtons: [
      <Pressable
        key="settings"
        className="p-2"
        testID="progress-settings"
        data-testid="progress-settings"
        onPress={() => dispatch(Thunk_pushScreen("settings"))}
      >
        <IconCog2 color={Tailwind_semantic().icon.neutral} size={22} />
      </Pressable>,
    ],
  });
  return (
    <NavScreenContent>
      <View testID="home" data-testid="home">
        <View testID="my-bear-head" data-testid="my-bear-head" className="pt-2 pb-3">
          <BearScene state={state} lines={lines} onTarget={openBoardTarget} />
        </View>
        <SeasonNudgeCard stats={stats} />
        <MyBearSections />
      </View>
    </NavScreenContent>
  );
}
