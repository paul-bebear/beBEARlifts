import { JSX } from "react";
import { Pressable, View } from "react-native";
import { Onboarding_context } from "../models/onboarding";
import { OnboardingSteps_bearLine, OnboardingSteps_liftKeys, OnboardingSteps_text } from "../models/onboardingSteps";
import { IOnboardingAnswers } from "../models/onboardingAnswers";
import { Text } from "./primitives/text";
import { TextInput } from "./primitives/textInput";
import { IOnboardingKindProps, OnboardingBearSays, OnboardingColors as C } from "./onboardingStepFrame";

function DarkField(props: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  numeric?: boolean;
  big?: boolean;
  suffix?: string;
}): JSX.Element {
  return (
    <View className="flex-row items-center gap-2" style={{ flexShrink: 1, flexGrow: 1 }}>
      <TextInput
        accessibilityLabel={props.label}
        placeholder={props.label}
        placeholderTextColor={C.offText}
        keyboardType={props.numeric ? "decimal-pad" : "default"}
        autoCapitalize={props.numeric ? "none" : "words"}
        value={props.value}
        onChangeText={props.onChange}
        className={props.big ? "text-5xl font-bold" : "text-lg"}
        style={{
          flex: 1,
          color: C.text,
          borderWidth: 1.5,
          borderColor: C.border,
          backgroundColor: C.card,
          borderRadius: 14,
          paddingHorizontal: 16,
          paddingVertical: props.big ? 14 : 12,
          textAlign: props.big ? "center" : "left",
        }}
      />
      {props.suffix != null && (
        <Text className="text-xl font-bold" style={{ color: C.muted }}>
          {props.suffix}
        </Text>
      )}
    </View>
  );
}

function Chip(props: { label: string; selected: boolean; role: "button" | "radio"; onPress: () => void }): JSX.Element {
  return (
    <Pressable
      accessibilityRole={props.role}
      accessibilityLabel={props.label}
      accessibilityState={props.role === "radio" ? { checked: props.selected } : { selected: props.selected }}
      onPress={props.onPress}
      style={{
        paddingHorizontal: 16,
        paddingVertical: 9,
        borderRadius: 999,
        borderWidth: 1.5,
        borderColor: props.selected ? C.pickedBorder : C.border,
        backgroundColor: props.selected ? C.picked : C.card,
      }}
    >
      <Text className="font-bold" style={{ color: props.selected ? C.accent : C.text }}>
        {props.label}
      </Text>
    </Pressable>
  );
}

function UnitChips<T extends string>(props: {
  units: { key: T; label: string }[];
  value: T;
  onPick: (unit: T) => void;
}): JSX.Element {
  return (
    <View className="flex-row self-center gap-2">
      {props.units.map((unit) => (
        <Chip
          key={unit.key}
          role="button"
          label={unit.label}
          selected={unit.key === props.value}
          onPress={() => props.onPick(unit.key)}
        />
      ))}
    </View>
  );
}

export function OnboardingMeasure(props: IOnboardingKindProps<"measure">): JSX.Element {
  const { step, state, emit } = props;
  const a = state.answers;
  const patch = (value: Partial<IOnboardingAnswers>): void => emit({ type: "answers", patch: value });
  const ctx = Onboarding_context(state);
  return (
    <View className="gap-6">
      <OnboardingBearSays
        line={OnboardingSteps_bearLine(ctx)}
        mood={step.bear}
        text={OnboardingSteps_text(step.say, ctx)}
      />
      {step.measure === "age" && (
        <DarkField label="Age" numeric big value={a.age} onChange={(age) => patch({ age })} suffix="years" />
      )}
      {step.measure === "weight" && (
        <>
          <UnitChips
            units={[
              { key: "kg", label: "kg" },
              { key: "lb", label: "lb" },
            ]}
            value={a.unit}
            onPick={(unit) => patch({ unit })}
          />
          <DarkField
            label={`Weight in ${a.unit}`}
            numeric
            big
            value={a.weight}
            onChange={(weight) => patch({ weight })}
            suffix={a.unit}
          />
        </>
      )}
      {step.measure === "height" && (
        <>
          <UnitChips
            units={[
              { key: "cm", label: "cm" },
              { key: "ftin", label: "ft in" },
            ]}
            value={a.heightUnit}
            onPick={(heightUnit) => patch({ heightUnit })}
          />
          {a.heightUnit === "cm" ? (
            <DarkField
              label="Height in cm"
              numeric
              big
              value={a.height}
              onChange={(height) => patch({ height })}
              suffix="cm"
            />
          ) : (
            <View className="flex-row gap-3">
              <DarkField
                label="Height, feet"
                numeric
                big
                value={a.heightFt}
                onChange={(heightFt) => patch({ heightFt })}
                suffix="ft"
              />
              <DarkField
                label="Height, inches"
                numeric
                big
                value={a.heightIn}
                onChange={(heightIn) => patch({ heightIn })}
                suffix="in"
              />
            </View>
          )}
        </>
      )}
    </View>
  );
}

export function OnboardingTextStep(props: IOnboardingKindProps<"text">): JSX.Element {
  const { step, state, emit } = props;
  const ctx = Onboarding_context(state);
  const value =
    step.field === "name"
      ? state.answers.name
      : step.field === "invite"
        ? state.invite
        : (state.extras[step.id]?.[0] ?? "");
  const onChange = (text: string): void =>
    emit(
      step.field === "name"
        ? { type: "answers", patch: { name: text } }
        : step.field === "invite"
          ? { type: "invite", value: text }
          : { type: "extra", id: step.id, value: text === "" ? [] : [text] }
    );
  return (
    <View className="gap-6">
      <OnboardingBearSays
        line={OnboardingSteps_bearLine(ctx)}
        mood={step.bear}
        text={OnboardingSteps_text(step.say, ctx)}
      />
      <DarkField label={step.label} value={value} onChange={onChange} />
    </View>
  );
}

const liftExercises = ["Bench press", "Squat", "Deadlift", "Push-ups", "Pull-ups", "Curls"];

export function OnboardingLift(props: IOnboardingKindProps<"lift">): JSX.Element {
  const { step, state, emit } = props;
  const ctx = Onboarding_context(state);
  const k = OnboardingSteps_liftKeys;
  const exercise = state.extras[k.exercise]?.[0];
  const set = (key: string, text: string): void => emit({ type: "extra", id: key, value: text === "" ? [] : [text] });
  return (
    <View className="gap-5">
      <OnboardingBearSays
        line={OnboardingSteps_bearLine(ctx)}
        mood={step.bear}
        text={OnboardingSteps_text(step.say, ctx)}
      />
      <View className="flex-row flex-wrap justify-center gap-2">
        {liftExercises.map((name) => (
          <Chip
            key={name}
            role="radio"
            label={name}
            selected={exercise === name}
            onPress={() => set(k.exercise, name)}
          />
        ))}
      </View>
      <DarkField
        label={`Weight in ${state.answers.unit}`}
        numeric
        big
        value={state.extras[k.weight]?.[0] ?? ""}
        onChange={(text) => set(k.weight, text)}
        suffix={state.answers.unit}
      />
      <DarkField
        label="Reps"
        numeric
        big
        value={state.extras[k.reps]?.[0] ?? ""}
        onChange={(text) => set(k.reps, text)}
        suffix="reps"
      />
    </View>
  );
}
