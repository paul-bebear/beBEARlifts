import { Dispatch, JSX } from "react";
import { Image, Switch, View } from "react-native";
import { IOnboardingEvent, IOnboardingState } from "../models/onboarding";
import { OnboardingHistory_summary } from "../models/onboardingHistory";
import { Text } from "./primitives/text";
import { TextInput } from "./primitives/textInput";
import { OnboardingAction, OnboardingControls_field } from "./onboardingControls";
import { OnboardingImages } from "./onboardingImages";

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
