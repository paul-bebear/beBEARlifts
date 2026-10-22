import { JSX, ReactNode, useMemo } from "react";
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
import { BearPanel } from "./bearPanel";
import { useBear } from "../utils/useBear";
import { useBadgeCelebration } from "../utils/useBearBadges";
import { BadgeUnlockedSheet } from "./badgeUnlockedSheet";
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

export function MyBearLayout(props: IMyBearLayoutProps): JSX.Element {
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
      <BearScene state={state} tiles={tiles} onTile={(tile) => openBoardTarget(dispatch, tile.target)} />
      <BearPanel state={state} now={now} onLine={setLine} />
    </View>
  );
}

export function ScreenMyBear(): JSX.Element {
  const dispatch = useTrackedDispatch();
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
    </NavScreenContent>
  );
}
