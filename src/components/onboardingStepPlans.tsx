import { Dispatch, JSX, useMemo, useState } from "react";
import { Pressable, View } from "react-native";
import { IDispatch } from "../ducks/types";
import {
  IOnboardingEvent,
  IOnboardingState,
  Onboarding_cards,
  Onboarding_context,
  Onboarding_selectedCard,
} from "../models/onboarding";
import { IOnboardingStepDef, OnboardingSteps_bearLine, OnboardingSteps_text } from "../models/onboardingSteps";
import { BearPlan_text } from "../models/bearPlan";
import { OnboardingProgram_dayNames } from "../models/onboardingProgram";
import { Text } from "./primitives/text";
import { OnboardingSignIn } from "./onboardingSignIn";
import { OnboardingBear, OnboardingBearSays, OnboardingButton, OnboardingColors as C } from "./onboardingStepFrame";

const goalNames = { size: "Get bigger", strength: "Get stronger", both: "Bigger and stronger" };
const placeNames = { gym: "Full gym", dumbbells: "Dumbbells", street: "Street bars", none: "No equipment" };
const experienceNames = { new: "New", months: "A few months", years: "Years" };

function Row(props: { icon: string; label: string; value: string }): JSX.Element {
  return (
    <View className="flex-row items-center gap-3">
      <Text className="text-2xl">{props.icon}</Text>
      <View>
        <Text className="text-sm" style={{ color: C.muted }}>
          {props.label}
        </Text>
        <Text className="text-base font-bold" style={{ color: C.text }}>
          {props.value}
        </Text>
      </View>
    </View>
  );
}

export function OnboardingPlans(props: {
  state: IOnboardingState;
  step: Extract<IOnboardingStepDef, { kind: "plans" }>;
  emit: Dispatch<IOnboardingEvent>;
}): JSX.Element {
  const { state, step } = props;
  const ctx = Onboarding_context(state);
  const a = state.answers;
  const cards = useMemo(() => Onboarding_cards(state), [state.answers]);
  const picked = Onboarding_selectedCard(state);
  const dayNames = useMemo(
    () => (picked == null ? [] : OnboardingProgram_dayNames(BearPlan_text(picked.params))),
    [picked]
  );
  const places = a.places.map((p) => placeNames[p]).join(", ");
  return (
    <View className="gap-5">
      <OnboardingBearSays
        line={OnboardingSteps_bearLine(ctx)}
        mood={step.bear}
        text={OnboardingSteps_text(step.say, ctx)}
      />
      <View className="gap-3 p-4 rounded-2xl" style={{ backgroundColor: C.card }}>
        <Text className="text-xl font-bold" style={{ color: C.text }}>
          {a.name.trim() === "" ? "Your plan" : `${a.name.trim()}'s plan`}
        </Text>
        <Row icon="🎯" label="Goal" value={goalNames[a.goal]} />
        <Row icon="📍" label="Where" value={places === "" ? "No equipment" : places} />
        <Row icon="📈" label="Experience" value={experienceNames[a.experience]} />
        {a.agile && <Row icon="⚡" label="Extra" value="Agility work" />}
      </View>
      <View className="gap-3" accessibilityRole="radiogroup" accessibilityLabel="Plans">
        {cards.map((card) => {
          const selected = picked?.days === card.days;
          return (
            <Pressable
              key={card.days}
              accessibilityRole="radio"
              accessibilityLabel={card.name}
              accessibilityState={{ checked: selected, selected }}
              onPress={() => props.emit({ type: "pick", days: card.days })}
              style={{
                borderRadius: 16,
                borderWidth: 1.5,
                borderColor: selected ? C.pickedBorder : C.border,
                backgroundColor: selected ? C.picked : C.card,
                padding: 16,
                gap: 4,
              }}
            >
              {card.recommended && (
                <Text
                  className="self-start px-2 py-1 mb-1 text-xs font-bold rounded-full"
                  style={{ backgroundColor: C.accent, color: C.accentText }}
                >
                  BEST FOR YOU
                </Text>
              )}
              <Text className="text-xl font-bold" style={{ color: selected ? C.accent : C.text }}>
                {card.name}
              </Text>
              <Text style={{ color: C.muted }}>
                {card.days} days a week · about {card.minutes} minutes
              </Text>
              <Text style={{ color: C.text }}>{card.summary}</Text>
              {selected &&
                dayNames.map((name, d) => (
                  <Text key={d} style={{ color: C.muted }}>
                    {d + 1}. {name}
                  </Text>
                ))}
            </Pressable>
          );
        })}
      </View>
      <Text style={{ color: C.muted }}>Start light. The app adds weight when you hit the reps.</Text>
    </View>
  );
}

function SignInCard(props: { dispatch: IDispatch }): JSX.Element {
  return (
    <View className="p-4 rounded-2xl bg-background-default">
      <OnboardingSignIn dispatch={props.dispatch} />
    </View>
  );
}

export function OnboardingSignInStep(props: {
  state: IOnboardingState;
  step: Extract<IOnboardingStepDef, { kind: "signIn" }>;
  dispatch: IDispatch;
  busy: boolean;
  onStart: () => void;
}): JSX.Element {
  const { state, step } = props;
  const ctx = Onboarding_context(state);
  const [showSignIn, setShowSignIn] = useState(false);
  if (step.variant === "save") {
    return (
      <View className="gap-5">
        <OnboardingBearSays
          line={OnboardingSteps_bearLine(ctx)}
          mood={step.bear}
          text={OnboardingSteps_text(step.say, ctx)}
        />
        <SignInCard dispatch={props.dispatch} />
      </View>
    );
  }
  return (
    <View className="flex-1 gap-4">
      <View className="items-center flex-1 gap-3 pt-10">
        <Text
          accessibilityRole="header"
          className="font-bold"
          style={{ color: C.accent, fontSize: 52, letterSpacing: 1 }}
        >
          beBEAR
        </Text>
        <Text className="text-xl" style={{ color: C.text }}>
          Lift. Feed. Grow.
        </Text>
        <OnboardingBear line={OnboardingSteps_bearLine(ctx)} mood="normal" size={230} />
        <Text className="text-lg text-center" style={{ color: C.text }}>
          {OnboardingSteps_text(step.say, ctx)}
        </Text>
      </View>
      {showSignIn && <SignInCard dispatch={props.dispatch} />}
      <Text className="text-sm text-center" style={{ color: C.muted }}>
        Free to use · No payment needed
      </Text>
      <OnboardingButton label="Get started" disabled={props.busy} onPress={props.onStart} />
      {!showSignIn && <OnboardingButton label="I have an account" look="outline" onPress={() => setShowSignIn(true)} />}
    </View>
  );
}
