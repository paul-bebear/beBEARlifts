import { JSX } from "react";
import { View } from "react-native";
import { IOnboardingState, Onboarding_context } from "../models/onboarding";
import { IOnboardingArt, OnboardingSteps_bearLine, OnboardingSteps_text } from "../models/onboardingSteps";
import { IBearMood } from "../models/bear";
import { Text } from "./primitives/text";
import {
  IOnboardingKindProps,
  OnboardingBear,
  OnboardingBearSays,
  OnboardingBody,
  OnboardingColors as C,
  OnboardingTitle,
} from "./onboardingStepFrame";

export function OnboardingArtView(props: {
  art: IOnboardingArt;
  state: IOnboardingState;
  mood: IBearMood;
}): JSX.Element {
  const line = OnboardingSteps_bearLine(Onboarding_context(props.state));
  const row = (children: JSX.Element[]): JSX.Element => (
    <View className="flex-row flex-wrap items-end justify-center gap-2">{children}</View>
  );
  switch (props.art) {
    case "levels":
      return row(
        [1, 3, 5, 7, 10, 12].map((level) => (
          <View key={level} className="items-center">
            <OnboardingBear line={line} mood="normal" level={level} size={86} />
            <Text className="text-xs" style={{ color: C.muted }}>
              Level {level}
            </Text>
          </View>
        ))
      );
    case "growth":
    case "forecast":
      return row(
        [1, 5, 9].map((level, i) => (
          <OnboardingBear key={level} line={line} mood="normal" level={level} size={80 + i * 50} />
        ))
      );
    case "food":
      return (
        <View className="items-center gap-2">
          <OnboardingBear line={line} mood="hungry" size={190} />
          <Text className="text-4xl">🍗 🥚 🍚 🥛</Text>
        </View>
      );
    case "outfits":
      return (
        <View className="items-center gap-2">
          <OnboardingBear line={line} mood="pumped" size={190} />
          <Text className="text-4xl">👕 🩳 🧢 🧦</Text>
        </View>
      );
    case "widget":
      return (
        <View className="items-center">
          <View
            style={{
              width: 170,
              height: 170,
              borderRadius: 36,
              backgroundColor: C.accent,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <OnboardingBear line={line} mood="pumped" size={130} />
          </View>
        </View>
      );
    case "badge":
      return (
        <Text className="text-center" style={{ fontSize: 120 }}>
          🏅
        </Text>
      );
    case "tired":
    case "mirror":
      return (
        <View className="items-center">
          <OnboardingBear line={line} mood="tired" size={220} />
        </View>
      );
    case "plan":
      return (
        <View className="gap-2 p-4 rounded-2xl" style={{ backgroundColor: C.card }}>
          {["Day 1 · Full body", "Day 2 · Rest", "Day 3 · Full body", "Day 4 · Rest", "Day 5 · Full body"].map(
            (day) => (
              <Text key={day} className="text-lg" style={{ color: day.includes("Rest") ? C.muted : C.text }}>
                {day}
              </Text>
            )
          )}
        </View>
      );
    case "cub":
      return (
        <View className="items-center">
          <OnboardingBear line={line} mood={props.mood} size={230} />
        </View>
      );
  }
}

export function OnboardingSay(props: IOnboardingKindProps<"say">): JSX.Element {
  const { step, state } = props;
  const ctx = Onboarding_context(state);
  const title = OnboardingSteps_text(step.title, ctx);
  const say = OnboardingSteps_text(step.say, ctx);
  const art = step.art == null ? null : <OnboardingArtView art={step.art} state={state} mood={step.bear} />;
  if (step.look === "intro") {
    return (
      <View className="gap-8">
        <OnboardingTitle text={title} />
        {art}
        <OnboardingBody text={say} />
      </View>
    );
  }
  if (step.look === "story") {
    return (
      <View className="items-center gap-4 pt-4">
        <OnboardingTitle text={title} center />
        <OnboardingBody text={say} center />
        {art ?? <OnboardingBear line={OnboardingSteps_bearLine(ctx)} mood={step.bear} size={220} />}
      </View>
    );
  }
  return (
    <View className="gap-6">
      <OnboardingBearSays line={OnboardingSteps_bearLine(ctx)} mood={step.bear} text={say} />
      {art}
    </View>
  );
}

export function OnboardingResult(props: IOnboardingKindProps<"result">): JSX.Element {
  const { step, state } = props;
  const ctx = Onboarding_context(state);
  return (
    <View className="items-center justify-center flex-1 gap-5">
      {step.result === "badge" ? (
        <OnboardingArtView art="badge" state={state} mood={step.bear} />
      ) : (
        <>
          <Text className="text-xl font-bold" style={{ color: C.text }}>
            Your bear today
          </Text>
          <OnboardingTitle text="LEVEL 1 · CUB" center accent />
          <OnboardingBear line={OnboardingSteps_bearLine(ctx)} mood={step.bear} size={230} />
        </>
      )}
      <OnboardingBody text={OnboardingSteps_text(step.say, ctx)} center />
    </View>
  );
}
