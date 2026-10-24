import { Dispatch, JSX } from "react";
import { View } from "react-native";
import { IOnboardingEvent } from "../models/onboarding";
import { IOnboardingAnswers } from "../models/onboardingAnswers";
import { FoodTargets_activities, FoodTargets_goals } from "../models/foodTargets";
import {
  OnboardingChoices_dayLabel,
  OnboardingChoices_days,
  OnboardingChoices_goals,
} from "../models/onboardingChoices";
import { Text } from "./primitives/text";
import { OnboardingChip, OnboardingLink, OnboardingPill } from "./onboardingChoiceButtons.native";

function ChipText(props: { label: string; detail: string }): JSX.Element {
  return (
    <View className="flex-1">
      <Text className="text-lg font-bold">{props.label}</Text>
      <Text className="text-text-secondary">{props.detail}</Text>
    </View>
  );
}

export function OnboardingFoodQuestions(props: {
  a: IOnboardingAnswers;
  emit: Dispatch<IOnboardingEvent>;
}): JSX.Element {
  const { a, emit } = props;
  return (
    <>
      <Text className="text-xl font-semibold" accessibilityRole="header">
        Food targets (optional)
      </Text>
      <Text className="text-text-secondary">
        Answer both questions to set your targets using your age, height, weight and sex. Leave either blank to skip.
      </Text>
      <View style={{ gap: 8 }}>
        <Text className="font-semibold">How active are you?</Text>
        {FoodTargets_activities.map((activity) => (
          <OnboardingChip
            key={activity.key}
            on={a.activity === activity.key}
            onPress={() =>
              emit({ type: "answers", patch: { activity: a.activity === activity.key ? undefined : activity.key } })
            }
          >
            <ChipText label={activity.label} detail={activity.detail} />
          </OnboardingChip>
        ))}
      </View>
      <View style={{ gap: 8 }}>
        <Text className="font-semibold">What is your weight goal?</Text>
        <View className="flex-row flex-wrap" style={{ gap: 8 }}>
          {FoodTargets_goals.map((goal) => (
            <OnboardingPill
              key={goal.key}
              on={a.foodGoal === goal.key}
              label={goal.label}
              onPress={() =>
                emit({ type: "answers", patch: { foodGoal: a.foodGoal === goal.key ? undefined : goal.key } })
              }
            />
          ))}
        </View>
      </View>
      <OnboardingLink
        label="Skip food targets"
        onPress={() => emit({ type: "answers", patch: { activity: undefined, foodGoal: undefined } })}
      />
    </>
  );
}

export function OnboardingWantQuestions(props: {
  a: IOnboardingAnswers;
  emit: Dispatch<IOnboardingEvent>;
}): JSX.Element {
  const { a, emit } = props;
  return (
    <>
      <Text className="text-3xl font-bold" accessibilityRole="header">
        What do you want?
      </Text>
      <View style={{ gap: 12 }}>
        {OnboardingChoices_goals.map((g) => (
          <OnboardingChip
            key={g.key}
            on={a.goal === g.key}
            onPress={() => emit({ type: "answers", patch: { goal: g.key } })}
          >
            <ChipText label={g.label} detail={g.detail} />
          </OnboardingChip>
        ))}
      </View>
      <View style={{ gap: 8 }}>
        <Text className="font-semibold">How many days a week can you train?</Text>
        <View className="flex-row flex-wrap" style={{ gap: 8 }}>
          {OnboardingChoices_days.map((days) => (
            <OnboardingPill
              key={days}
              on={a.days === days}
              label={OnboardingChoices_dayLabel(days)}
              onPress={() => emit({ type: "answers", patch: { days: a.days === days ? undefined : days } })}
            />
          ))}
        </View>
      </View>
      <OnboardingChip role="switch" on={a.agile} onPress={() => emit({ type: "answers", patch: { agile: !a.agile } })}>
        <ChipText label="More agile" detail="Adds jumps and quick feet" />
        <View
          className={`w-12 h-7 rounded-full p-1 flex-row ${a.agile ? "bg-yellow-500 justify-end" : "bg-gray-300 justify-start"}`}
        >
          <View className="w-5 h-5 bg-white rounded-full" />
        </View>
      </OnboardingChip>
    </>
  );
}
