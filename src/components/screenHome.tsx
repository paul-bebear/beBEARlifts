import { JSX, useEffect, useMemo, useState } from "react";
import { View } from "react-native";
import { untrack, useTrackedDispatch, useTrackedState } from "../navigation/TrackedStateContext";
import { useNavOptions } from "../navigation/useNavOptions";
import { navigateToModal } from "../navigation/navigationService";
import { Thunk_pushScreen } from "../ducks/thunks";
import { IDispatch } from "../ducks/types";
import { BearScene } from "./bearScene";
import { BearHouseScene } from "./bearHouseScene";
import { HoneySheet } from "./honeySheet";
import { useBear } from "../utils/useBear";
import { useBearHouse } from "../utils/useBearHouse";
import { useFoodLog } from "../utils/foodLogStore";
import { ProgramGoalStore } from "../utils/programGoalStore";
import { WeekScheduleStore } from "../utils/weekScheduleStore";
import { useFollowWeekSchedule } from "../utils/useFollowWeekSchedule";
import { WorkoutStart_open } from "../utils/workoutStart";
import { CubClient_refresh } from "../utils/cubClient";
import { BearBoard_lines, IBearBoardTarget } from "../models/bearBoard";
import { IBearHouseOpenTarget } from "../models/bearHouse";
import { BearScene_place } from "../models/bearScene";
import { BearText_honeySaved } from "../models/bearText";
import { Program_evaluate, Program_getProgramDay } from "../models/program";
import { QuickActions_isBagCheckOn, QuickActions_workout } from "../models/quickActions";
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

function openHouseTarget(
  target: IBearHouseOpenTarget,
  dispatch: IDispatch,
  isBagCheckOn: boolean,
  openHoney: () => void
): void {
  switch (target.kind) {
    case "plus":
      navigateToModal("plusSheetModal");
      return;
    case "door":
      WorkoutStart_open(QuickActions_workout({ isOngoingProgress: false, isBagCheckOn }).action, dispatch);
      return;
    case "signIn":
      dispatch(Thunk_pushScreen("friends", undefined, { tab: "friends" }));
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
    case "addFriend":
      navigateToModal("addFriendModal");
      return;
    case "honey":
      openHoney();
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
  const house = useBearHouse();
  const [isHoneyOpen, setIsHoneyOpen] = useState(false);
  const foodLog = useFoodLog();
  const goalLog = ProgramGoalStore.use();
  const schedule = WeekScheduleStore.use();
  const program = useMemo(() => Program_evaluate(props.program, settings), [props.program, settings]);
  useFollowWeekSchedule(program, history, props.progress != null, dispatch);
  useEffect(() => {
    CubClient_refresh().catch(() => undefined);
  }, []);
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
  const isBagCheckOn = QuickActions_isBagCheckOn(settings.skipBagCheck, tracked.storage.currentProgramId);
  const place = BearScene_place(props.progress != null);
  useNavOptions({ navHidden: true });
  return (
    <View style={{ flex: 1 }} testID="home" data-testid="home">
      {place === "gym" ? (
        <BearScene
          state={state}
          lines={lines}
          onTarget={openBoardTarget}
          onExit={() => navigateToModal("gymExitModal")}
        />
      ) : (
        <BearHouseScene
          state={state}
          room={house.room}
          wall={house.wall}
          lines={lines}
          objects={house.objects}
          onBoardTarget={openBoardTarget}
          onTarget={(target) => openHouseTarget(target, dispatch, isBagCheckOn, () => setIsHoneyOpen(true))}
        />
      )}
      {isHoneyOpen && (
        <HoneySheet
          balance={house.honey.balance}
          today={house.honey.today}
          saved={BearText_honeySaved(house.honey.earned)}
          onClose={() => setIsHoneyOpen(false)}
        />
      )}
    </View>
  );
}
