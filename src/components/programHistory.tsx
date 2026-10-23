import { JSX, useMemo, useState } from "react";
import { useTimedMemo } from "../utils/useTimedMemo";
import { Pressable, ScrollView, View } from "react-native";
import { IDispatch } from "../ducks/types";
import { IProgram, IHistoryRecord, ISettings, ISubscription } from "../types";
import { INavCommon } from "../models/state";
import { useNavOptions } from "../navigation/useNavOptions";
import { useTabBarContentPadding } from "../navigation/useTabBarContentPadding";
import { History_getHistoryRecordsForTimerange, History_getHomeAggregates } from "../models/history";
import { Thunk_pushScreen } from "../ducks/thunks";
import { HomeToday_card, HomeToday_historyLabel } from "../models/homeToday";
import { IconChevronRight } from "./icons/iconFoodUi";
import { Tailwind_semantic } from "../utils/tailwindConfig";
import { Text } from "./primitives/text";
import { ShareCardTheme as T } from "./shareCards/shareCardTheme";
import { BearAvatar } from "./bearAvatar";
import { useBear } from "../utils/useBear";
import { useFoodLog } from "../utils/foodLogStore";
import { WeekDots_build } from "../models/weekDots";
import { TodayPill_dayName, TodayPill_text } from "../models/todayPill";
import { WeekSchedule_todayFor } from "../models/weekSchedule";
import { WeekScheduleStore } from "../utils/weekScheduleStore";
import { useFollowWeekSchedule } from "../utils/useFollowWeekSchedule";
import { HistoryRecordsNullState } from "./historyRecordsNullState";
import { Progress_isCurrent } from "../models/progress";
import { Program_nextHistoryRecord } from "../models/program";
import { HistoryRecordView } from "./historyRecord";
import { HomeChecklist } from "./homeChecklist";
import { navigateToModal } from "../navigation/navigationService";
import { IEvaluatedProgram, Program_evaluate, Program_getProgramDay } from "../models/program";
import { HistoryCollapse_isExpanded, HistoryCollapse_toggle, IExpandedHistoryIds } from "../models/historyCollapse";

interface IProps {
  program: IProgram;
  progress?: IHistoryRecord;
  history: IHistoryRecord[];
  settings: ISettings;
  subscription: ISubscription;
  navCommon: INavCommon;
  dispatch: IDispatch;
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

  const card = HomeToday_card({ hasProgress: props.progress != null, historyCount: sortedHistoryDesc.length });
  const todayRecord = useTimedMemo(
    "programHistory.todayRecord",
    () =>
      card === "ongoing"
        ? props.progress
        : card === "next"
          ? Program_nextHistoryRecord(props.program, props.settings, props.navCommon.stats)
          : undefined,
    [card, props.progress, props.program, props.settings, props.navCommon.stats]
  );
  const historyLabel = HomeToday_historyLabel(sortedHistoryDesc.length);

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
  useFollowWeekSchedule(evaluatedProgram, props.history, props.progress != null, dispatch);

  const tabBarPadding = useTabBarContentPadding();
  const [expandedIds, setExpandedIds] = useState<IExpandedHistoryIds>({});

  useNavOptions({ navHidden: true });

  const header = (
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

  if (todayRecord == null) {
    return (
      <View className="flex-1" style={{ paddingBottom: tabBarPadding }}>
        {header}
        {checklist}
        <HistoryRecordsNullState />
      </View>
    );
  }

  return (
    <View className="flex-1">
      {header}
      <ScrollView contentContainerStyle={{ paddingBottom: tabBarPadding }}>
        {checklist}
        <View className="mx-4">
          <HistoryRecordView
            isOngoing={isOngoing}
            showTitle={true}
            programDay={programDay}
            prs={prs}
            settings={props.settings}
            historyRecord={todayRecord}
            dispatch={dispatch}
            isExpanded={HistoryCollapse_isExpanded(todayRecord, expandedIds, isOngoing)}
            onToggleExpanded={(id) => setExpandedIds((ids) => HistoryCollapse_toggle(ids, id))}
          />
        </View>
        {historyLabel != null && (
          <Pressable
            testID="home-history"
            data-testid="home-history"
            accessibilityRole="link"
            onPress={() => dispatch(Thunk_pushScreen("history", undefined, { tab: "food" }))}
            className="flex-row items-center px-4 py-3.5 mx-4 mt-4 rounded-2xl bg-background-subtle"
          >
            <Text className="flex-1 text-base">{historyLabel}</Text>
            <IconChevronRight size={16} color={Tailwind_semantic().icon.neutral} />
          </Pressable>
        )}
      </ScrollView>
    </View>
  );
}
