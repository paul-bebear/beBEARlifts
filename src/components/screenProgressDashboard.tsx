import { JSX, ReactNode, useMemo } from "react";
import { View, Pressable } from "react-native";
import { Text } from "./primitives/text";
import { useTrackedState, useTrackedDispatch, untrack } from "../navigation/TrackedStateContext";
import { useNavOptions } from "../navigation/useNavOptions";
import { navigateToModal } from "../navigation/navigationService";
import { Thunk_pushScreen, Thunk_pushToEditProgram } from "../ducks/thunks";
import { ProgramCard_build } from "../models/programCard";
import type { IProgramCard } from "../models/programCard";
import { IconDoc2 } from "./icons/iconDoc2";
import {
  ProgressDashboard_build,
  ProgressDashboard_caloriesPill,
  ProgressDashboard_days,
  ProgressDashboard_loggedAgo,
  ProgressDashboard_workoutsLine,
} from "../models/progressDashboard";
import { FoodLog_formatRange } from "../models/foodLog";
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

const pillColors = {
  neutral: "rgba(59, 130, 246, 0.22)",
  good: "rgba(34, 197, 94, 0.22)",
  warn: "rgba(234, 179, 8, 0.28)",
};

function StatCard(props: {
  testID: string;
  icon: ReactNode;
  label: string;
  value: string;
  unit?: string;
  subtitle: string;
  pill?: { text: string; tone: keyof typeof pillColors };
  onPress: () => void;
}): JSX.Element {
  const semantic = Tailwind_semantic();
  return (
    <Pressable
      testID={props.testID}
      data-testid={props.testID}
      onPress={props.onPress}
      className="flex-row items-center p-4 mx-4 mb-3 rounded-2xl bg-background-subtle"
    >
      <View className="items-center justify-center mr-4 border w-14 h-14 rounded-2xl border-border-neutral">
        {props.icon}
      </View>
      <View className="flex-1">
        <Text className="text-xs font-semibold tracking-wide uppercase text-text-secondary">{props.label}</Text>
        <Text className="font-bold" style={{ fontSize: 30, lineHeight: 36 }}>
          {props.value}
          {props.unit != null && <Text className="text-base font-semibold text-text-secondary"> {props.unit}</Text>}
        </Text>
        <Text className="text-sm text-text-secondary" numberOfLines={1}>
          {props.subtitle}
        </Text>
      </View>
      {props.pill != null && (
        <View className="px-2.5 py-1 mr-2 rounded-full" style={{ backgroundColor: pillColors[props.pill.tone] }}>
          <Text className="text-sm font-semibold">{props.pill.text}</Text>
        </View>
      )}
      <IconChevronRight size={16} color={semantic.icon.neutral} />
    </Pressable>
  );
}

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
  const dashboard = useMemo(
    () => ProgressDashboard_build({ history, stats, foodLog, settings, now: Date.now() }),
    [history, stats, foodLog, settings]
  );
  const currentProgramId = state.storage.currentProgramId;
  const program = untrack(
    currentProgramId != null ? state.storage.programs.find((p) => p.id === currentProgramId) : undefined
  );
  const programCard = useMemo(() => ProgramCard_build(program, settings), [program, settings]);
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

  const goals = foodLog.goals;
  const weight = dashboard.weight;
  return (
    <View className="pt-2 pb-6" testID="progress-dashboard" data-testid="progress-dashboard">
      {OfflineOnly_isEnabled() && (
        <ProgramCardView card={programCard} onPress={() => dispatch(Thunk_pushToEditProgram())} />
      )}
      <Pressable
        testID="progress-targets"
        data-testid="progress-targets"
        onPress={() => navigateToModal("foodGoalsModal")}
        className="p-4 mx-4 mb-3 rounded-2xl"
        style={{ backgroundColor: "rgba(59, 130, 246, 0.18)" }}
      >
        <View className="flex-row items-center">
          <Text className="flex-1 text-sm font-bold tracking-wide uppercase text-text-link">Daily targets</Text>
          <Text className="text-sm text-text-secondary">Change ›</Text>
        </View>
        <Text className="mt-1 text-2xl font-bold">{FoodLog_formatRange(goals.calories, " cal")}</Text>
        <Text className="mt-1 text-sm text-text-secondary">
          {FoodLog_formatRange(goals.protein, "g")} protein · {FoodLog_formatRange(goals.carbs, "g")} carbs ·{" "}
          {FoodLog_formatRange(goals.fat, "g")} fat
        </Text>
      </Pressable>
      <StatCard
        testID="progress-weight"
        icon={<IconStats size={24} color={blue} />}
        label="Weight"
        value={weight != null ? `${Math.round(weight.value.value * 10) / 10}` : "–"}
        unit={weight != null ? weight.value.unit : undefined}
        subtitle={weight != null ? ProgressDashboard_loggedAgo(weight.daysAgo) : "Tap to log your weight"}
        onPress={() => dispatch(Thunk_pushScreen("stats"))}
      />
      <StatCard
        testID="progress-nutrition"
        icon={<IconFood size={24} color={blue} />}
        label="Nutrition"
        value={`${dashboard.nutrition.daysLogged} of ${ProgressDashboard_days}`}
        unit="days"
        subtitle="Last 7 days"
        pill={ProgressDashboard_caloriesPill(dashboard.nutrition.today)}
        onPress={() => dispatch(Thunk_pushScreen("food", undefined, { tab: "food" }))}
      />
      <StatCard
        testID="progress-workouts"
        icon={<IconBarbell2 />}
        label="Workouts"
        value={`${dashboard.workouts.count}`}
        unit="in 7 days"
        subtitle={ProgressDashboard_workoutsLine(dashboard.workouts)}
        onPress={() => dispatch(Thunk_pushScreen("main", undefined, { tab: "home" }))}
      />
      <Text className="px-4 pt-4 pb-2 text-xs font-semibold tracking-wide uppercase text-text-secondary">More</Text>
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
      <LinkRow
        testID="progress-exercise-stats"
        icon={<IconBarbell2 />}
        title="Exercise stats"
        onPress={() => dispatch(Thunk_pushScreen("exerciseStats"))}
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
