import { JSX, useMemo } from "react";
import { View, Pressable } from "react-native";
import { Text } from "./primitives/text";
import { useTrackedState, useTrackedDispatch, untrack } from "../navigation/TrackedStateContext";
import { Thunk_pushScreen, Thunk_pushToEditProgram } from "../ducks/thunks";
import { ProgramCard_build } from "../models/programCard";
import type { IProgramCard } from "../models/programCard";
import { IconDoc2 } from "./icons/iconDoc2";
import {
  ProgressDashboard_build,
  ProgressDashboard_days,
  ProgressDashboard_workoutsLine,
} from "../models/progressDashboard";
import { ProgressHub_build, ProgressHub_plannedPerWeek } from "../models/progressHub";
import { Program_evaluate, Program_isEmpty } from "../models/program";
import { ProgramGoalStore } from "../utils/programGoalStore";
import { StepsStore } from "../utils/stepsStore";
import { useStepsHealthSync } from "../utils/useStepsHealthSync";
import { useIsFocused } from "@react-navigation/native";
import { ProgressPhotoStore } from "../utils/progressPhotoStore";
import { ProgressDetailLine, ProgressDetailLink, ProgressExpandRow } from "./progressHubCards";
import { History_getHistoryRecordsForTimerange, History_getHomeAggregates } from "../models/history";
import { DateUtils_firstDayOfWeekTimestamp } from "../utils/date";
import { WeekInsights } from "./weekInsights";
import { useFoodLog } from "../utils/foodLogStore";
import { Tailwind_semantic } from "../utils/tailwindConfig";
import { IconStats } from "./icons/iconStats";
import { IconFood } from "./icons/iconFood";
import { IconBarbell2 } from "./icons/iconBarbell2";
import { IconChevronRight } from "./icons/iconFoodUi";

function ProgramCardView(props: { card: IProgramCard; onPress: () => void }): JSX.Element {
  return (
    <Pressable
      testID="progress-program"
      data-testid="progress-program"
      onPress={props.onPress}
      className="flex-row items-center p-4 mx-4 mb-3 rounded-2xl bg-background-subtle"
    >
      <View className="relative items-center justify-center mr-4 border w-14 h-14 rounded-2xl border-border-neutral">
        <IconDoc2 />
        {props.card.hasErrors && (
          <View
            testID="progress-program-error"
            data-testid="progress-program-error"
            className="absolute w-2.5 h-2.5 rounded-full bg-redv2-700"
            style={{ top: 6, right: 6 }}
          />
        )}
      </View>
      <View className="flex-1">
        <Text className="text-xs font-semibold tracking-wide uppercase text-text-secondary">Program</Text>
        <Text className="text-xl font-bold" numberOfLines={1}>
          {props.card.title}
        </Text>
        <Text className="text-sm text-text-secondary" numberOfLines={1}>
          {props.card.subtitle}
        </Text>
      </View>
      <IconChevronRight size={16} color={Tailwind_semantic().icon.neutral} />
    </Pressable>
  );
}

export function ProgramCardSection(): JSX.Element {
  const state = useTrackedState();
  const dispatch = useTrackedDispatch();
  const settings = untrack(state.storage.settings);
  const currentProgramId = state.storage.currentProgramId;
  const program = untrack(
    currentProgramId != null ? state.storage.programs.find((p) => p.id === currentProgramId) : undefined
  );
  const programCard = useMemo(() => ProgramCard_build(program, settings), [program, settings]);
  return <ProgramCardView card={programCard} onPress={() => dispatch(Thunk_pushToEditProgram())} />;
}

export function StatsSections(): JSX.Element {
  const state = useTrackedState();
  const dispatch = useTrackedDispatch();
  const history = untrack(state.storage.history);
  const stats = untrack(state.storage.stats);
  const settings = untrack(state.storage.settings);
  const foodLog = useFoodLog();
  const isFocused = useIsFocused();
  const dashboard = useMemo(
    () => ProgressDashboard_build({ history, stats, foodLog, settings, now: Date.now() }),
    [history, stats, foodLog, settings, isFocused]
  );
  const currentProgramId = state.storage.currentProgramId;
  const program = untrack(
    currentProgramId != null ? state.storage.programs.find((p) => p.id === currentProgramId) : undefined
  );
  const goalLog = ProgramGoalStore.use();
  const steps = StepsStore.use();
  const photos = ProgressPhotoStore.use();
  const plannedPerWeek = useMemo(
    () =>
      ProgressHub_plannedPerWeek(
        program != null && !Program_isEmpty(program) ? Program_evaluate(program, settings).weeks : undefined
      ),
    [program, settings]
  );
  const hub = useMemo(
    () =>
      ProgressHub_build({ goalLog, history, stats, foodLog, steps, photos, plannedPerWeek, settings, now: Date.now() }),
    [goalLog, history, stats, foodLog, steps, photos, plannedPerWeek, settings, isFocused]
  );

  const subscription = untrack(state.storage.subscription);
  const weekInsights = useMemo(() => {
    const startWeekFromMonday = !!settings.startWeekFromMonday;
    const thisWeekStart = DateUtils_firstDayOfWeekTimestamp(Date.now(), startWeekFromMonday);
    const lastWeekStart = new Date(thisWeekStart);
    lastWeekStart.setDate(lastWeekStart.getDate() - 7);
    return {
      prs: History_getHomeAggregates(history, startWeekFromMonday).prs,
      thisWeekStart,
      thisWeekHistory: History_getHistoryRecordsForTimerange(history, thisWeekStart, "week", startWeekFromMonday),
      lastWeekHistory: History_getHistoryRecordsForTimerange(
        history,
        lastWeekStart.getTime(),
        "week",
        startWeekFromMonday
      ),
    };
  }, [history, settings.startWeekFromMonday, isFocused]);

  useStepsHealthSync(steps.syncHealth, isFocused);
  const blue = Tailwind_semantic().icon.blue;

  return (
    <View className="pt-2" testID="all-stats" data-testid="all-stats">
      <ProgressExpandRow
        testID="progress-weight"
        icon={<IconStats size={24} color={blue} />}
        label="Weight"
        value={hub.weight.value ?? "–"}
        subtitle={hub.weight.subtitle}
      >
        {hub.weight.change != null && <ProgressDetailLine text={hub.weight.change} />}
        <ProgressDetailLink
          testID="progress-weight-open"
          title="Log or see your weight"
          onPress={() => dispatch(Thunk_pushScreen("stats"))}
        />
      </ProgressExpandRow>
      <ProgressExpandRow
        testID="progress-nutrition"
        icon={<IconFood size={24} color={blue} />}
        label="Nutrition"
        value={`${hub.nutrition.daysLogged} of ${hub.nutrition.daysTracked} days`}
        subtitle={`Logged ${hub.nutrition.since}`}
      >
        <ProgressDetailLine
          text={`${dashboard.nutrition.daysLogged} of ${ProgressDashboard_days} days logged in the last week`}
        />
        <ProgressDetailLink
          testID="progress-nutrition-open"
          title="Open the food log"
          onPress={() => dispatch(Thunk_pushScreen("food", undefined, { tab: "food" }))}
        />
      </ProgressExpandRow>
      <ProgressExpandRow
        testID="progress-workouts"
        icon={<IconBarbell2 />}
        label="Workout consistency"
        value={`${hub.consistency.percent}%`}
        subtitle={`${hub.consistency.done} of ${hub.consistency.planned} planned in ${hub.consistency.windowDays} days`}
      >
        <ProgressDetailLine
          text={`${dashboard.workouts.count} in the last 7 days · ${ProgressDashboard_workoutsLine(dashboard.workouts)}`}
        />
        <ProgressDetailLink
          testID="progress-workouts-open"
          title="Open workout history"
          onPress={() => dispatch(Thunk_pushScreen("history", undefined, { tab: "food" }))}
        />
      </ProgressExpandRow>
      <View className="mx-4 mb-3">
        <WeekInsights
          dispatch={dispatch}
          prs={weekInsights.prs}
          selectedFirstDayOfWeek={weekInsights.thisWeekStart}
          thisWeekHistory={weekInsights.thisWeekHistory}
          lastWeekHistory={weekInsights.lastWeekHistory}
          settings={settings}
          subscription={subscription}
        />
      </View>
    </View>
  );
}
