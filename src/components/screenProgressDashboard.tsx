import { JSX, ReactNode, useMemo, useState } from "react";
import { DailyChecklist_doneDays, DailyChecklist_streak } from "../models/dailyChecklist";
import {
  MonthCalendar_build,
  MonthCalendar_monthOf,
  MonthCalendar_shift,
  MonthCalendar_workoutDays,
} from "../models/monthCalendar";
import { ChecklistStore } from "../utils/checklistStore";
import { ProgressCalendarHeader } from "./progressCalendarHeader";
import { View, Pressable } from "react-native";
import { Text } from "./primitives/text";
import { useTrackedState, useTrackedDispatch, untrack } from "../navigation/TrackedStateContext";
import { useNavOptions } from "../navigation/useNavOptions";
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
import {
  ProgressDetailLine,
  ProgressDetailLink,
  ProgressExpandRow,
  ProgressGoalCard,
  ProgressPhotosCard,
  ProgressStepsCard,
} from "./progressHubCards";
import { FoodLog_dayKey } from "../models/foodLog";
import { useFoodLog } from "../utils/foodLogStore";
import { Tailwind_semantic } from "../utils/tailwindConfig";
import { IconMe } from "./icons/iconMe";
import { IconCog2 } from "./icons/iconCog2";
import { IconStats } from "./icons/iconStats";
import { IconFood } from "./icons/iconFood";
import { IconBarbell2 } from "./icons/iconBarbell2";
import { IconGraphs } from "./icons/iconGraphs";
import { IconChevronRight } from "./icons/iconFoodUi";
import { IconSpeaker } from "./icons/iconSpeaker";
import { OfflineOnly_isEnabled } from "../utils/offlineOnly";
import { RunSensors_isAvailable } from "../utils/runSensors";
import { CloudRestoreBanner } from "./cloudRestoreBanner";

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

function LinkRow(props: { testID: string; icon: ReactNode; title: string; onPress: () => void }): JSX.Element {
  return (
    <Pressable
      testID={props.testID}
      data-testid={props.testID}
      onPress={props.onPress}
      className="flex-row items-center px-4 py-3.5 mx-4 mb-2 rounded-2xl bg-background-subtle"
    >
      <View className="w-6 mr-3">{props.icon}</View>
      <Text className="flex-1 text-base">{props.title}</Text>
      <IconChevronRight size={16} color={Tailwind_semantic().icon.neutral} />
    </Pressable>
  );
}

export function ScreenProgressDashboard(): JSX.Element {
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
  const programCard = useMemo(() => ProgramCard_build(program, settings), [program, settings]);
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

  const checklistLog = ChecklistStore.use();
  const today = FoodLog_dayKey(new Date());
  const [selectedDay, setSelectedDay] = useState(today);
  const [month, setMonth] = useState(() => MonthCalendar_monthOf(today));
  const [isCalendarCollapsed, setIsCalendarCollapsed] = useState(true);
  const streak = useMemo(
    () => DailyChecklist_streak(DailyChecklist_doneDays({ stats, foodLog, log: checklistLog }), today),
    [stats, foodLog, checklistLog, today]
  );
  const calendar = useMemo(
    () => MonthCalendar_build({ month, today, selected: selectedDay, workoutDays: MonthCalendar_workoutDays(history) }),
    [month, today, selectedDay, history]
  );

  const selectDay = (day: string): void => {
    setSelectedDay(day);
    setMonth(MonthCalendar_monthOf(day));
  };

  useStepsHealthSync(steps.syncHealth, isFocused);
  const semantic = Tailwind_semantic();
  const iconColor = semantic.icon.neutral;
  const blue = semantic.icon.blue;

  useNavOptions({
    navTitle: "Progress",
    navRightButtons: [
      <Pressable
        key="me"
        className="p-2"
        testID="progress-profile"
        data-testid="progress-profile"
        onPress={() => dispatch(Thunk_pushScreen("stats"))}
      >
        <IconMe color={iconColor} />
      </Pressable>,
      <Pressable
        key="settings"
        className="p-2"
        testID="progress-settings"
        data-testid="progress-settings"
        onPress={() => dispatch(Thunk_pushScreen("settings"))}
      >
        <IconCog2 color={iconColor} size={22} />
      </Pressable>,
    ],
  });

  return (
    <View className="pt-2 pb-6" testID="progress-dashboard" data-testid="progress-dashboard">
      {OfflineOnly_isEnabled() && <CloudRestoreBanner dispatch={dispatch} />}
      <ProgressCalendarHeader
        streak={streak}
        calendar={calendar}
        isCollapsed={isCalendarCollapsed}
        onToggleCollapse={() => setIsCalendarCollapsed(!isCalendarCollapsed)}
        onShiftMonth={(delta) => setMonth(MonthCalendar_shift(month, delta))}
        onSelectDay={selectDay}
        onStreakPress={() => dispatch(Thunk_pushScreen("streak"))}
      />
      {OfflineOnly_isEnabled() && (
        <ProgramCardView card={programCard} onPress={() => dispatch(Thunk_pushToEditProgram())} />
      )}
      <ProgressGoalCard
        goal={hub.goal}
        onChangeGoal={() => dispatch(Thunk_pushScreen("goalWizard", { mode: "goal" }))}
        onChangePace={() => dispatch(Thunk_pushScreen("goalWizard", { mode: "pace" }))}
      />
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
          onPress={() => dispatch(Thunk_pushScreen("main", undefined, { tab: "home" }))}
        />
      </ProgressExpandRow>
      <Text className="px-4 pt-4 pb-2 text-xs font-semibold tracking-wide uppercase text-text-secondary">
        Bonus tracking
      </Text>
      <ProgressStepsCard steps={hub.steps} onPress={() => dispatch(Thunk_pushScreen("steps"))} />
      <ProgressPhotosCard photos={hub.photos} onPress={() => dispatch(Thunk_pushScreen("progressPhotos"))} />
      <Text className="px-4 pt-4 pb-2 text-xs font-semibold tracking-wide uppercase text-text-secondary">More</Text>
      {OfflineOnly_isEnabled() && RunSensors_isAvailable() && (
        <LinkRow
          testID="progress-runs"
          icon={<IconGraphs color={iconColor} />}
          title="Runs"
          onPress={() => dispatch(Thunk_pushScreen("runs"))}
        />
      )}
      <LinkRow
        testID="progress-graphs"
        icon={<IconGraphs color={iconColor} />}
        title="Graphs"
        onPress={() => dispatch(Thunk_pushScreen("graphsList"))}
      />
      <LinkRow
        testID="progress-measurements"
        icon={<IconStats size={20} color={iconColor} />}
        title="Body measurements"
        onPress={() => dispatch(Thunk_pushScreen("measurements"))}
      />
      <LinkRow
        testID="progress-body-scans"
        icon={<IconStats size={20} color={iconColor} />}
        title="Body composition"
        onPress={() => dispatch(Thunk_pushScreen("bodyScans"))}
      />
      {OfflineOnly_isEnabled() && (
        <LinkRow
          testID="progress-music"
          icon={<IconSpeaker size={20} color={iconColor} />}
          title="Workout music"
          onPress={() => dispatch(Thunk_pushScreen("music"))}
        />
      )}
      {OfflineOnly_isEnabled() && (
        <LinkRow
          testID="progress-reports"
          icon={<IconGraphs color={iconColor} />}
          title="Workout reports"
          onPress={() => dispatch(Thunk_pushScreen("reports"))}
        />
      )}
      <LinkRow
        testID="progress-exercise-stats"
        icon={<IconBarbell2 />}
        title="Exercise stats"
        onPress={() => dispatch(Thunk_pushScreen("exercises"))}
      />
      <LinkRow
        testID="progress-settings-row"
        icon={<IconCog2 color={iconColor} size={20} />}
        title="Settings, backup and account"
        onPress={() => dispatch(Thunk_pushScreen("settings"))}
      />
    </View>
  );
}
