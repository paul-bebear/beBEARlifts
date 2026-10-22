import { JSX, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTimedMemo } from "../utils/useTimedMemo";
import { usePerfScrollMarkers } from "../utils/usePerfScrollMarkers";
import { Pressable, View } from "react-native";
import { LegendList, LegendListRef } from "@legendapp/list";
import { IDispatch } from "../ducks/types";
import { IProgram, IHistoryRecord, ISettings, ISubscription } from "../types";
import { INavCommon, IState, updateState } from "../models/state";
import { useNavOptions } from "../navigation/useNavOptions";
import { useTabBarContentPadding } from "../navigation/useTabBarContentPadding";
import { History_getHistoryRecordsForTimerange, History_getHomeAggregates } from "../models/history";
import { Thunk_pushScreen } from "../ducks/thunks";
import { lb } from "lens-shmens";
import { Text } from "./primitives/text";
import { ShareCardTheme as T } from "./shareCards/shareCardTheme";
import { BearAvatar } from "./bearAvatar";
import { useBear } from "../utils/useBear";
import { useFoodLog } from "../utils/foodLogStore";
import { WeekDots_build } from "../models/weekDots";
import { TodayPill_dayName, TodayPill_text } from "../models/todayPill";
import { WeekSchedule_todayFor } from "../models/weekSchedule";
import { WeekScheduleStore } from "../utils/weekScheduleStore";
import { HistoryRecordsNullState } from "./historyRecordsNullState";
import { Progress_isCurrent } from "../models/progress";
import { Program_nextHistoryRecord } from "../models/program";
import { useTrackedState } from "../navigation/TrackedStateContext";
import { HistoryRecordView } from "./historyRecord";
import { HomeChecklist } from "./homeChecklist";
import { navigateToModal } from "../navigation/navigationService";
import { IEvaluatedProgram, Program_evaluate, Program_getProgramDay } from "../models/program";
import {
  HistoryCollapse_expand,
  HistoryCollapse_isExpanded,
  HistoryCollapse_toggle,
  IExpandedHistoryIds,
} from "../models/historyCollapse";

interface IProps {
  program: IProgram;
  progress?: IHistoryRecord;
  history: IHistoryRecord[];
  settings: ISettings;
  subscription: ISubscription;
  navCommon: INavCommon;
  dispatch: IDispatch;
  initialHistoryRecordId?: number;
}

export function getWeekHistory(
  history: IHistoryRecord[],
  firstDayOfWeek: number,
  startWeekFromMonday?: boolean
): IHistoryRecord[] {
  return History_getHistoryRecordsForTimerange(history, firstDayOfWeek, "week", startWeekFromMonday);
}

function HomeHeader(props: {
  history: IHistoryRecord[];
  settings: ISettings;
  program: IEvaluatedProgram;
  nextDayName?: string;
  dispatch: IDispatch;
}): JSX.Element {
  const foodLog = useFoodLog();
  const bear = useBear();
  const schedule = WeekScheduleStore.use();
  const now = Date.now();
  const dayName = TodayPill_dayName(WeekSchedule_todayFor(schedule, props.program, now), props.nextDayName);
  const dots = WeekDots_build({
    history: props.history,
    foodLog,
    now,
    startWeekFromMonday: props.settings.startWeekFromMonday,
  });
  const pill = TodayPill_text({ dayName, history: props.history, now });
  return (
    <View className="px-4 pt-2 pb-1" testID="home-header" data-testid="home-header">
      <View className="flex-row items-center">
        <Pressable
          testID="home-bear-head"
          data-testid="home-bear-head"
          onPress={() => props.dispatch(Thunk_pushScreen("progressDashboard", undefined, { tab: "graphs" }))}
        >
          <BearAvatar state={bear.state} size={56} />
        </Pressable>
        <Pressable
          testID="home-week-dots"
          data-testid="home-week-dots"
          onPress={() => props.dispatch(Thunk_pushScreen("food", undefined, { tab: "food" }))}
          className="flex-row items-center flex-1 ml-4"
          style={{ justifyContent: "space-between" }}
        >
          {dots.map((dot) => (
            <View
              key={dot.day}
              testID={`home-week-dot-${dot.day}`}
              data-testid={`home-week-dot-${dot.day}`}
              className={`rounded-full border ${dot.isToday ? "border-2" : ""} border-border-neutral`}
              style={{ width: 20, height: 20, backgroundColor: dot.filled ? T.honey : "transparent" }}
            />
          ))}
        </Pressable>
      </View>
      <View className="flex-row items-center mt-4">
        <Text className="text-2xl font-bold">Today</Text>
        <View
          className="px-3 py-1 ml-3 rounded-full bg-background-subtle"
          testID="home-today-pill"
          data-testid="home-today-pill"
        >
          <Text className="text-sm font-semibold">{pill}</Text>
        </View>
      </View>
    </View>
  );
}

export function ProgramHistoryView(props: IProps): JSX.Element {
  const dispatch = props.dispatch;
  const aggregates = useTimedMemo(
    "programHistory.aggregates",
    () => History_getHomeAggregates(props.history, !!props.settings.startWeekFromMonday),
    [props.history, props.settings.startWeekFromMonday]
  );
  const { sortedHistoryDesc, prs } = aggregates;

  const sortedHistory = useTimedMemo(
    "programHistory.sortedHistory",
    () => {
      if (!props.progress && (!props.program || sortedHistoryDesc.length === 0)) {
        return sortedHistoryDesc;
      }
      const arr = sortedHistoryDesc.slice();
      if (props.progress) {
        arr.unshift(props.progress);
      } else if (props.program) {
        arr.unshift(Program_nextHistoryRecord(props.program, props.settings, props.navCommon.stats));
      }
      return arr;
    },
    [sortedHistoryDesc, props.progress, props.program, props.settings, props.navCommon.stats]
  );

  const evaluatedProgram = useTimedMemo(
    "programHistory.evaluatedProgram",
    () => Program_evaluate(props.program, props.settings),
    [props.program, props.settings]
  );
  const programDay = useMemo(
    () => Program_getProgramDay(evaluatedProgram, evaluatedProgram.nextDay),
    [evaluatedProgram]
  );
  const isOngoing = !!(props.progress && Progress_isCurrent(props.progress));

  const flatListRef = useRef<LegendListRef>(null);
  const tabBarPadding = useTabBarContentPadding();

  const initialHistoryRecordId = props.initialHistoryRecordId;

  const [initialScrollIndex, setInitialScrollIndex] = useState(() => {
    if (initialHistoryRecordId == null) {
      return 0;
    }
    const idx = sortedHistory.findIndex((record) => record.id === initialHistoryRecordId);
    return idx >= 0 ? idx : 0;
  });
  const [listRemountKey, setListRemountKey] = useState(0);
  const [expandedIds, setExpandedIds] = useState<IExpandedHistoryIds>(() =>
    HistoryCollapse_expand({}, initialHistoryRecordId)
  );
  const onToggleExpanded = useCallback((recordId: number) => {
    setExpandedIds((ids) => HistoryCollapse_toggle(ids, recordId));
  }, []);

  const trackedState = useTrackedState();
  const scrollToRecordId = trackedState.scrollToHistoryRecordId;
  useEffect(() => {
    if (scrollToRecordId != null) {
      updateState(props.dispatch, [lb<IState>().p("scrollToHistoryRecordId").record(undefined)], "Clear scroll target");
      const index = sortedHistory.findIndex((record) => record.id === scrollToRecordId);
      if (index >= 0) {
        setExpandedIds((ids) => HistoryCollapse_expand(ids, scrollToRecordId));
        setInitialScrollIndex(index);
        setListRemountKey((k) => k + 1);
      }
    }
  }, [scrollToRecordId]);

  useNavOptions({ navHidden: true });

  const renderItem = useCallback(
    ({ item }: { item: IHistoryRecord }) => (
      <View key={item.id} className="mx-4 mb-6">
        <HistoryRecordView
          isOngoing={isOngoing}
          showTitle={true}
          programDay={programDay}
          prs={prs}
          settings={props.settings}
          historyRecord={item}
          dispatch={dispatch}
          isExpanded={HistoryCollapse_isExpanded(item, expandedIds, isOngoing)}
          onToggleExpanded={onToggleExpanded}
        />
      </View>
    ),
    [isOngoing, programDay, prs, props.settings, dispatch, expandedIds, onToggleExpanded]
  );

  const keyExtractor = useCallback((item: IHistoryRecord) => String(item.id), []);

  const scrollMarkers = usePerfScrollMarkers("ProgramHistoryView");

  const stickyHeader = (
    <HomeHeader
      history={props.history}
      settings={props.settings}
      program={evaluatedProgram}
      nextDayName={programDay?.name}
      dispatch={dispatch}
    />
  );

  const checklist = (
    <View className="pt-4">
      <HomeChecklist
        stats={props.navCommon.stats}
        units={props.settings.units}
        dispatch={dispatch}
        history={props.history}
        isOngoing={isOngoing}
        onTrain={() => navigateToModal("nextWorkoutModal")}
        startWeekFromMonday={props.settings.startWeekFromMonday}
      />
    </View>
  );

  if (sortedHistory.length === 0) {
    return (
      <View className="flex-1" style={{ paddingBottom: tabBarPadding }}>
        {stickyHeader}
        {checklist}
        <HistoryRecordsNullState />
      </View>
    );
  }

  return (
    <View className="flex-1">
      {stickyHeader}
      <LegendList
        key={listRemountKey}
        ref={flatListRef}
        data={sortedHistory}
        ListHeaderComponent={checklist}
        renderItem={renderItem}
        extraData={expandedIds}
        keyExtractor={keyExtractor}
        estimatedItemSize={300}
        contentContainerStyle={{ paddingBottom: tabBarPadding }}
        initialScrollIndex={initialScrollIndex}
        waitForInitialLayout={true}
        onScrollBeginDrag={scrollMarkers.onScrollBeginDrag}
        onScrollEndDrag={scrollMarkers.onScrollEndDrag}
        onMomentumScrollEnd={scrollMarkers.onMomentumScrollEnd}
      />
    </View>
  );
}
