import { JSX, ReactNode, useMemo, useState } from "react";
import { Pressable, View } from "react-native";
import { untrack, useTrackedDispatch, useTrackedState } from "../navigation/TrackedStateContext";
import { NavScreenContent } from "../navigation/NavScreenContent";
import { useNavOptions } from "../navigation/useNavOptions";
import { Thunk_pushScreen } from "../ducks/thunks";
import { IDispatch } from "../ducks/types";
import { Tailwind_semantic } from "../utils/tailwindConfig";
import { IconCog2 } from "./icons/iconCog2";
import { ProgressSections } from "./screenProgressDashboard";
import { CheckInChart } from "./checkInChart";
import { BearScene } from "./bearScene";
import { BearTv } from "./bearTv";
import { BearPanel } from "./bearPanel";
import { useBear } from "../utils/useBear";
import { useBearHoney } from "../utils/useBearHoney";
import { useBadgeCelebration } from "../utils/useBearBadges";
import { BadgeUnlockedSheet } from "./badgeUnlockedSheet";
import { HandleSheet } from "./handleSheet";
import { BearName_title } from "../models/bearName";
import { Friends_forUser } from "../models/friends";
import { FriendsStore } from "../utils/friendsClient";
import { CloudStore } from "../utils/supabaseClient";
import { BearStore } from "../utils/bearStore";
import { NotesStore } from "../utils/notesStore";
import { BearBoard_tiles, IBearBoardTarget } from "../models/bearBoard";
import { BearCelebration_setLine } from "../models/bearCelebration";
import { IBearLine } from "../models/bearStoreData";
import { DateUtils_firstDayOfWeekTimestamp } from "../utils/date";

interface IMyBearLayoutProps {
  head: ReactNode;
  checkIns?: ReactNode;
  children: ReactNode;
}

function MyBearLayout(props: IMyBearLayoutProps): JSX.Element {
  return (
    <View testID="my-bear" data-testid="my-bear">
      {props.head}
      {props.checkIns}
      {props.children}
    </View>
  );
}

function openBoardTarget(dispatch: IDispatch, target: IBearBoardTarget): void {
  if (target === "journal") {
    dispatch(Thunk_pushScreen("food", undefined, { tab: "food" }));
  } else {
    dispatch(Thunk_pushScreen(target));
  }
}

function setLine(line: IBearLine): void {
  BearStore.update((store) => BearCelebration_setLine(store, line)).catch(() => undefined);
}

function MyBearHead(): JSX.Element {
  const dispatch = useTrackedDispatch();
  const tracked = useTrackedState();
  const history = untrack(tracked.storage.history);
  const stats = untrack(tracked.storage.stats);
  const settings = untrack(tracked.storage.settings);
  const notes = NotesStore.use();
  const { state, plannedPerWeek } = useBear();
  const honey = useBearHoney();
  const now = Date.now();
  const tiles = useMemo(
    () =>
      BearBoard_tiles({
        history,
        workouts: state.workouts,
        stats,
        notes,
        units: settings.units,
        plannedPerWeek,
        weekStart: DateUtils_firstDayOfWeekTimestamp(now, settings.startWeekFromMonday),
        now,
      }),
    [history, state, stats, notes, settings, plannedPerWeek]
  );
  return (
    <View testID="my-bear-head" data-testid="my-bear-head" className="pt-2">
      <BearScene
        state={state}
        tiles={tiles}
        onTile={(tile) => openBoardTarget(dispatch, tile.target)}
        tv={(box) => <BearTv box={box} />}
      />
      <BearPanel state={state} now={now} honey={honey.balance} todayHoney={honey.today} onLine={setLine} />
    </View>
  );
}

export function ScreenMyBear(): JSX.Element {
  const dispatch = useTrackedDispatch();
  const userId = CloudStore.use().session?.userId;
  const me = Friends_forUser(FriendsStore.use(), userId).me;
  const [showsNameSheet, setShowsNameSheet] = useState(false);
  useNavOptions({
    navTitle: BearName_title(me),
    navOnTitleClick: () => setShowsNameSheet(true),
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
  const celebration = useBadgeCelebration();
  return (
    <NavScreenContent>
      <MyBearLayout head={<MyBearHead />} checkIns={<CheckInChart />}>
        <ProgressSections />
      </MyBearLayout>
      {celebration.badge != null && (
        <BadgeUnlockedSheet
          badge={celebration.badge}
          onClose={() => celebration.dismiss(true)}
          onViewAll={() => {
            celebration.dismiss(false);
            dispatch(Thunk_pushScreen("streak"));
          }}
        />
      )}
      {showsNameSheet && (
        <HandleSheet
          onClose={() => setShowsNameSheet(false)}
          onOpenSettings={() => {
            setShowsNameSheet(false);
            dispatch(Thunk_pushScreen("settings"));
          }}
        />
      )}
    </NavScreenContent>
  );
}
