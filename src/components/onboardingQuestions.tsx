import { Dispatch, JSX } from "react";
import { Image, Switch, View } from "react-native";
import { IOnboardingEvent, IOnboardingState } from "../models/onboarding";
import { OnboardingHistory_summary } from "../models/onboardingHistory";
import { IOnboardingAnswers } from "../models/onboardingAnswers";
import { FoodTargets_activities, FoodTargets_goals } from "../models/foodTargets";
import { IBearGoal } from "../models/bearPlan";
import { Text } from "./primitives/text";
import { TextInput } from "./primitives/textInput";
import { OnboardingAction, OnboardingChoice, OnboardingControls_field } from "./onboardingControls";
import { OnboardingImages } from "./onboardingImages";

const goals: { key: IBearGoal; label: string; detail: string }[] = [
  { key: "size", label: "Size", detail: "Bigger muscles" },
  { key: "strength", label: "Strength", detail: "Lift heavier" },
  { key: "both", label: "Both", detail: "Heavy first lift, then muscle work" },
];

export function OnboardingFoodQuestions(props: {
  a: IOnboardingAnswers;
  emit: Dispatch<IOnboardingEvent>;
}): JSX.Element {
  const { a, emit } = props;
  return (
    <>
      <Text accessibilityRole="header" className="text-xl font-semibold">
        Food targets (optional)
      </Text>
      <Text className="text-text-secondary">
        Answer both questions to set your targets using your age, height, weight and sex. Leave either blank to skip.
      </Text>
      <View className="gap-2">
        <Text className="font-semibold">How active are you?</Text>
        {FoodTargets_activities.map((activity) => (
          <OnboardingChoice
            key={activity.key}
            selected={a.activity === activity.key}
            onPress={() =>
              emit({ type: "answers", patch: { activity: a.activity === activity.key ? undefined : activity.key } })
            }
          >
            <Text className="font-bold">{activity.label}</Text>
            <Text className="text-text-secondary">{activity.detail}</Text>
          </OnboardingChoice>
        ))}
      </View>
      <View className="gap-2">
        <Text className="font-semibold">What is your weight goal?</Text>
        <View className="flex-row flex-wrap gap-2">
          {FoodTargets_goals.map((goal) => (
            <OnboardingChoice
              key={goal.key}
              pill
              selected={a.foodGoal === goal.key}
              onPress={() =>
                emit({ type: "answers", patch: { foodGoal: a.foodGoal === goal.key ? undefined : goal.key } })
              }
            >
              <Text>{goal.label}</Text>
            </OnboardingChoice>
          ))}
        </View>
      </View>
      <OnboardingAction onPress={() => emit({ type: "answers", patch: { activity: undefined, foodGoal: undefined } })}>
        Skip food targets
      </OnboardingAction>
    </>
  );
}

export function OnboardingWantQuestions(props: {
  a: IOnboardingAnswers;
  emit: Dispatch<IOnboardingEvent>;
}): JSX.Element {
  const { a } = props;
  return (
    <>
      <Text accessibilityRole="header" className="text-3xl font-bold">
        What do you want?
      </Text>
      <View className="gap-3">
        {goals.map((g) => (
          <OnboardingChoice
            key={g.key}
            selected={a.goal === g.key}
            onPress={() => props.emit({ type: "answers", patch: { goal: g.key } })}
          >
            <Text className="font-bold">{g.label}</Text>
            <Text className="text-text-secondary">{g.detail}</Text>
          </OnboardingChoice>
        ))}
      </View>
      <View className="gap-2">
        <Text className="font-semibold">How many days a week can you train?</Text>
        <View className="flex-row flex-wrap gap-2">
          {([2, 3, 4, 5, 6] as const).map((days) => (
            <OnboardingChoice
              key={days}
              pill
              selected={a.days === days}
              onPress={() => props.emit({ type: "answers", patch: { days: a.days === days ? undefined : days } })}
            >
              <Text>{days === 6 ? "6+" : days}</Text>
            </OnboardingChoice>
          ))}
        </View>
      </View>
      <View
        className={`flex-row items-center gap-3 p-4 border-2 rounded-2xl ${a.agile ? "border-yellow-500 bg-background-cardyellow" : "border-border-prominent"}`}
      >
        <View className="flex-1">
          <Text className="font-bold">More agile</Text>
          <Text className="text-text-secondary">Adds jumps and quick feet</Text>
        </View>
        <Switch
          accessibilityLabel="More agile"
          value={a.agile}
          onValueChange={(agile) => props.emit({ type: "answers", patch: { agile } })}
        />
      </View>
    </>
  );
}

export function OnboardingQuestions(props: { form: IOnboardingState; emit: Dispatch<IOnboardingEvent> }): JSX.Element {
  const { form, emit } = props;
  return (
    <View className="gap-5">
      <Text accessibilityRole="header" className="text-3xl font-bold">
        Import my own
      </Text>
      <Text>Add screenshots of your plan and recent workouts. Up to 6. The AI brings in your history too.</Text>
      <Text>Screenshots</Text>
      <OnboardingImages busy={form.resizing} emit={emit} />
      <Text accessibilityLiveRegion="polite">
        {form.resizing ? "Resizing screenshots…" : `${form.images.length} of 6 screenshots`}
      </Text>
      <View className="flex-row flex-wrap gap-3">
        {form.images.map((image, i) => (
          <View key={i}>
            <Image
              source={{ uri: image }}
              accessibilityLabel={`Screenshot ${i + 1}`}
              className="w-24 h-32"
              resizeMode="contain"
            />
            <OnboardingAction onPress={() => emit({ type: "removeImage", index: i })}>Remove {i + 1}</OnboardingAction>
          </View>
        ))}
      </View>
      <Text>Plan, injuries, or other details (optional)</Text>
      <TextInput
        accessibilityLabel="Plan, injuries, or other details (optional)"
        className={OnboardingControls_field}
        multiline
        style={{ minHeight: 120, textAlignVertical: "top" }}
        maxLength={6000}
        value={form.answers.plan}
        onChangeText={(plan) => emit({ type: "answers", patch: { plan } })}
      />
    </View>
  );
}

export function OnboardingImportedPlan(props: {
  form: IOnboardingState;
  emit: Dispatch<IOnboardingEvent>;
  busy: boolean;
}): JSX.Element | null {
  const result = props.form.result;
  if (result == null) {
    return null;
  }
  return (
    <>
      <Text accessibilityRole="header" className="text-3xl font-bold">
        Your plan is ready.
      </Text>
      <Text accessibilityRole="header" className="text-2xl font-semibold">
        {result.name}
      </Text>
      <Text>{result.days} training days per week</Text>
      <Text>{result.answer.note}</Text>
      {result.history != null && (
        <View className="gap-2">
          <Text>{OnboardingHistory_summary(result.history)}</Text>
          {result.history.records.length > 0 && (
            <View className="flex-row items-center gap-3">
              <Switch
                accessibilityLabel="Add these workouts to my history"
                value={props.form.importHistory}
                disabled={props.busy}
                onValueChange={() => props.emit({ type: "toggleHistory" })}
              />
              <Text className="flex-1">Add these workouts to my history</Text>
            </View>
          )}
        </View>
      )}
      {result.answer.renamed.length > 0 && (
        <View>
          <Text accessibilityRole="header" className="font-semibold">
            Renamed exercises
          </Text>
          {result.answer.renamed.map(([from, to], i) => (
            <Text key={i}>
              {from} → {to}
            </Text>
          ))}
        </View>
      )}
    </>
  );
}
