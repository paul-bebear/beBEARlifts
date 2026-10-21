import { JSX, ReactNode, useState } from "react";
import { Pressable, View } from "react-native";
import { Text } from "./primitives/text";
import { ActionMenu } from "./actionMenu";
import { IconChevronRight } from "./icons/iconFoodUi";
import { IProgressHub, IProgressHubTone } from "../models/progressHub";
import { Steps_format } from "../models/steps";
import { Tailwind_semantic } from "../utils/tailwindConfig";

const pillColors: Record<IProgressHubTone, string> = {
  neutral: "rgba(59, 130, 246, 0.22)",
  good: "rgba(34, 197, 94, 0.22)",
  warn: "rgba(234, 179, 8, 0.28)",
};

function GoalFact(props: { label: string; value: string }): JSX.Element {
  return (
    <View className="flex-1">
      <Text className="text-xs text-text-secondary">{props.label}</Text>
      <Text className="text-base font-semibold" numberOfLines={1}>
        {props.value}
      </Text>
    </View>
  );
}

export function ProgressGoalCard(props: {
  goal: IProgressHub["goal"];
  onChangeGoal: () => void;
  onChangePace: () => void;
}): JSX.Element {
  const { goal } = props;
  if (goal == null) {
    return (
      <Pressable
        testID="progress-goal-set"
        data-testid="progress-goal-set"
        onPress={props.onChangeGoal}
        className="p-4 mx-4 mb-3 border rounded-2xl border-border-neutral"
      >
        <Text className="text-xs font-semibold tracking-wide uppercase text-text-secondary">Current goal</Text>
        <Text className="mt-1 text-xl font-bold">Set your goal</Text>
        <Text className="text-sm text-text-secondary">Build muscle, lose fat or maintain. Takes a minute.</Text>
      </Pressable>
    );
  }
  const actions = [
    ...(goal.canChangePace
      ? [{ label: "Change my pace", onPress: props.onChangePace, testID: "progress-goal-pace" }]
      : []),
    { label: "Change my goal", onPress: props.onChangeGoal, testID: "progress-goal-change-goal" },
  ];
  return (
    <View testID="progress-goal" data-testid="progress-goal" className="p-4 mx-4 mb-3 rounded-2xl bg-background-subtle">
      <View className="flex-row items-center">
        <Text className="flex-1 text-xs font-semibold tracking-wide uppercase text-text-secondary">Current goal</Text>
        <ActionMenu
          title="Change"
          actions={actions}
          renderTrigger={(open) => (
            <Pressable
              testID="progress-goal-change"
              data-testid="progress-goal-change"
              onPress={open}
              className="py-1 pl-3"
            >
              <Text className="text-sm font-semibold text-text-link">Change</Text>
            </Pressable>
          )}
        />
      </View>
      <Text className="mt-1 text-2xl font-bold">{goal.title}</Text>
      <View className="flex-row mt-3" style={{ gap: 8 }}>
        <GoalFact label="Pace" value={goal.pace} />
        <GoalFact label="Started" value={goal.started} />
        <GoalFact label="Start weight" value={goal.startWeight ?? "–"} />
      </View>
    </View>
  );
}

export function ProgressExpandRow(props: {
  testID: string;
  icon: ReactNode;
  label: string;
  value: string;
  subtitle: string;
  pill?: { text: string; tone: IProgressHubTone };
  children: ReactNode;
}): JSX.Element {
  const [isOpen, setIsOpen] = useState(false);
  const semantic = Tailwind_semantic();
  return (
    <View className="mx-4 mb-3 rounded-2xl bg-background-subtle">
      <Pressable
        testID={props.testID}
        data-testid={props.testID}
        onPress={() => setIsOpen(!isOpen)}
        className="flex-row items-center p-4"
      >
        <View className="items-center justify-center w-12 h-12 mr-3 border rounded-2xl border-border-neutral">
          {props.icon}
        </View>
        <View className="flex-1">
          <Text className="text-xs font-semibold tracking-wide uppercase text-text-secondary">{props.label}</Text>
          <Text className="text-xl font-bold" numberOfLines={1}>
            {props.value}
          </Text>
          <Text className="text-sm text-text-secondary" numberOfLines={1}>
            {props.subtitle}
          </Text>
        </View>
        {props.pill != null && (
          <View className="px-2.5 py-1 mr-2 rounded-full" style={{ backgroundColor: pillColors[props.pill.tone] }}>
            <Text className="text-xs font-semibold">{props.pill.text}</Text>
          </View>
        )}
        <View style={{ transform: [{ rotate: isOpen ? "90deg" : "0deg" }] }}>
          <IconChevronRight size={16} color={semantic.icon.neutral} />
        </View>
      </Pressable>
      {isOpen && <View className="px-4 pb-4">{props.children}</View>}
    </View>
  );
}

export function ProgressDetailLine(props: { text: string }): JSX.Element {
  return <Text className="mb-1 text-sm text-text-secondary">{props.text}</Text>;
}

export function ProgressDetailLink(props: { testID: string; title: string; onPress: () => void }): JSX.Element {
  return (
    <Pressable testID={props.testID} data-testid={props.testID} onPress={props.onPress} className="pt-2">
      <Text className="text-sm font-semibold text-text-link">{props.title} ›</Text>
    </Pressable>
  );
}

export function ProgressStepsCard(props: { steps: IProgressHub["steps"]; onPress: () => void }): JSX.Element {
  const { steps } = props;
  return (
    <Pressable
      testID="progress-steps"
      data-testid="progress-steps"
      onPress={props.onPress}
      className="p-4 mx-4 mb-3 rounded-2xl bg-background-subtle"
    >
      <View className="flex-row items-center">
        <Text className="flex-1 text-xs font-semibold tracking-wide uppercase text-text-secondary">Daily steps</Text>
        <IconChevronRight size={16} color={Tailwind_semantic().icon.neutral} />
      </View>
      <Text className="mt-1 text-xl font-bold">
        {steps.today != null ? Steps_format(steps.today) : "–"}
        <Text className="text-base font-semibold text-text-secondary"> / {Steps_format(steps.goal)}</Text>
      </Text>
      <View className="h-2 mt-2 overflow-hidden rounded-full bg-background-default">
        <View className="h-full bg-blue-400 rounded-full" style={{ width: `${Math.round(steps.fraction * 100)}%` }} />
      </View>
    </Pressable>
  );
}

export function ProgressPhotosCard(props: { photos: IProgressHub["photos"]; onPress: () => void }): JSX.Element {
  return (
    <Pressable
      testID="progress-photos-card"
      data-testid="progress-photos-card"
      onPress={props.onPress}
      className="flex-row items-center p-4 mx-4 mb-3 rounded-2xl bg-background-subtle"
    >
      <View className="flex-1">
        <Text className="text-xs font-semibold tracking-wide uppercase text-text-secondary">Progress photos</Text>
        <Text className="mt-1 text-base">{props.photos.subtitle}</Text>
      </View>
      <IconChevronRight size={16} color={Tailwind_semantic().icon.neutral} />
    </Pressable>
  );
}
