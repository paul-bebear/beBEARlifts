import { JSX, useEffect, useRef } from "react";
import { Animated, Pressable, View } from "react-native";
import { Onboarding_context } from "../models/onboarding";
import {
  IOnboardingChoiceStep,
  IOnboardingOption,
  OnboardingSteps_bearLine,
  OnboardingSteps_isMulti,
  OnboardingSteps_isSelected,
  OnboardingSteps_text,
} from "../models/onboardingSteps";
import { Text } from "./primitives/text";
import {
  IOnboardingKindProps,
  OnboardingBear,
  OnboardingBearSays,
  OnboardingBody,
  OnboardingButton,
  OnboardingColors as C,
  OnboardingTitle,
} from "./onboardingStepFrame";

function OptionCard(props: {
  option: IOnboardingOption<unknown>;
  selected: boolean;
  multi: boolean;
  grid: boolean;
  onPress: () => void;
}): JSX.Element {
  const { option, selected } = props;
  return (
    <Pressable
      accessibilityRole={props.multi ? "checkbox" : "radio"}
      accessibilityLabel={option.label}
      accessibilityState={{ checked: selected, selected }}
      onPress={props.onPress}
      style={{
        width: props.grid ? "48%" : "100%",
        minHeight: props.grid ? 110 : 56,
        borderRadius: 14,
        borderWidth: 1.5,
        borderColor: selected ? C.pickedBorder : C.border,
        backgroundColor: selected ? C.picked : C.card,
        padding: 14,
        flexDirection: props.grid ? "column" : "row",
        alignItems: "center",
        justifyContent: props.grid ? "center" : "flex-start",
        gap: 12,
      }}
    >
      {option.icon != null && <Text className={props.grid ? "text-4xl" : "text-2xl"}>{option.icon}</Text>}
      <View style={{ flex: props.grid ? 0 : 1, alignItems: props.grid ? "center" : "flex-start" }}>
        <Text
          className="text-base font-bold"
          style={{ color: selected ? C.accent : C.text, textAlign: props.grid ? "center" : "left" }}
        >
          {option.label}
        </Text>
        {option.detail != null && (
          <Text className="text-sm" style={{ color: C.muted, textAlign: props.grid ? "center" : "left" }}>
            {option.detail}
          </Text>
        )}
      </View>
      {props.multi && !props.grid && (
        <View
          style={{
            width: 22,
            height: 22,
            borderRadius: 6,
            borderWidth: 1.5,
            borderColor: selected ? C.pickedBorder : C.muted,
            backgroundColor: selected ? C.accent : "transparent",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {selected && (
            <Text className="text-xs font-bold" style={{ color: C.accentText }}>
              ✓
            </Text>
          )}
        </View>
      )}
    </Pressable>
  );
}

export function OnboardingChoiceView(props: IOnboardingKindProps<"choice">): JSX.Element {
  const { step, state } = props;
  const ctx = Onboarding_context(state);
  const choice: IOnboardingChoiceStep = step;
  const multi = OnboardingSteps_isMulti(choice);
  const quote = OnboardingSteps_text(step.title, ctx);
  const options: IOnboardingOption<unknown>[] = choice.options;
  return (
    <View className="gap-5">
      <OnboardingBearSays
        line={OnboardingSteps_bearLine(ctx)}
        mood={step.bear}
        text={OnboardingSteps_text(step.say, ctx)}
      />
      {quote !== "" && (
        <View className="items-center p-5 rounded-2xl" style={{ backgroundColor: C.card }}>
          <Text className="text-3xl" style={{ color: C.muted }}>
            ❝
          </Text>
          <Text className="text-lg italic text-center" style={{ color: C.text }}>
            {quote}
          </Text>
        </View>
      )}
      <View
        accessibilityRole={multi ? undefined : "radiogroup"}
        style={{
          flexDirection: step.grid ? "row" : "column",
          flexWrap: "wrap",
          gap: 10,
          justifyContent: "space-between",
        }}
      >
        {options.map((option) => (
          <OptionCard
            key={option.id}
            option={option}
            multi={multi}
            grid={step.grid === true}
            selected={OnboardingSteps_isSelected(choice, ctx, option.id)}
            onPress={() => props.emit({ type: "choose", optionId: option.id })}
          />
        ))}
      </View>
    </View>
  );
}

export function OnboardingHold(props: IOnboardingKindProps<"hold">): JSX.Element {
  const { step, state, emit } = props;
  const ctx = Onboarding_context(state);
  const fill = useRef(new Animated.Value(0)).current;
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const visit = state.visit;
  useEffect(() => () => clearTimeout(timer.current), []);
  const start = (): void => {
    Animated.timing(fill, { toValue: 1, duration: step.holdMs, useNativeDriver: false }).start();
    timer.current = setTimeout(() => emit({ type: "next", visit }), step.holdMs);
  };
  const stop = (): void => {
    clearTimeout(timer.current);
    fill.stopAnimation();
    Animated.timing(fill, { toValue: 0, duration: 200, useNativeDriver: false }).start();
  };
  const ring = fill.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1.15] });
  return (
    <View className="items-center justify-center flex-1 gap-6">
      <OnboardingTitle text={OnboardingSteps_text(step.title, ctx)} center />
      <OnboardingBody text={OnboardingSteps_text(step.say, ctx)} center />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Hold the bear to promise"
        accessibilityActions={[{ name: "activate" }]}
        onAccessibilityAction={() => emit({ type: "next", visit })}
        onPressIn={start}
        onPressOut={stop}
        style={{ width: 220, height: 220, alignItems: "center", justifyContent: "center" }}
      >
        <Animated.View
          style={{
            position: "absolute",
            width: 220,
            height: 220,
            borderRadius: 110,
            backgroundColor: C.accent,
            opacity: fill,
            transform: [{ scale: ring }],
          }}
        />
        <View
          style={{
            width: 180,
            height: 180,
            borderRadius: 90,
            backgroundColor: C.card,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <OnboardingBear line={OnboardingSteps_bearLine(ctx)} mood={step.bear} size={150} />
        </View>
      </Pressable>
      <Text className="text-base font-bold" style={{ color: C.accent }}>
        Press and hold your bear
      </Text>
      <OnboardingButton label="Can't hold? Tap to continue" look="link" onPress={() => emit({ type: "next", visit })} />
    </View>
  );
}

export function OnboardingLoading(props: IOnboardingKindProps<"loading">): JSX.Element {
  const { step, state, emit } = props;
  const visit = state.visit;
  const bars = useRef(step.bars.map(() => new Animated.Value(0))).current;
  useEffect(() => {
    const each = step.ms / Math.max(1, bars.length);
    Animated.sequence(
      bars.map((bar) => Animated.timing(bar, { toValue: 1, duration: each, useNativeDriver: false }))
    ).start();
    const timer = setTimeout(() => emit({ type: "next", visit }), step.ms + 300);
    return () => clearTimeout(timer);
  }, [visit]);
  return (
    <View className="justify-center flex-1 gap-6" accessibilityLiveRegion="polite">
      <OnboardingTitle text={OnboardingSteps_text(step.title, Onboarding_context(state))} />
      {step.bars.map((label, i) => (
        <View key={label} className="gap-2">
          <Text className="text-base" style={{ color: C.accent }}>
            {label}
          </Text>
          <View style={{ height: 10, borderRadius: 5, backgroundColor: C.off, overflow: "hidden" }}>
            <Animated.View
              style={{
                height: 10,
                borderRadius: 5,
                backgroundColor: C.accent,
                width: bars[i].interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] }),
              }}
            />
          </View>
        </View>
      ))}
      <View className="items-center pt-6">
        <OnboardingBear line={OnboardingSteps_bearLine(Onboarding_context(state))} mood="pumped" size={150} />
      </View>
    </View>
  );
}

export function OnboardingPermission(props: IOnboardingKindProps<"permission">): JSX.Element {
  const { step, state, emit } = props;
  const ctx = Onboarding_context(state);
  const visit = state.visit;
  const answer = (value: "allow" | "later"): void => {
    emit({ type: "extra", id: step.id, value: [value] });
    emit({ type: "next", visit });
  };
  const reminder = step.permission === "reminder";
  return (
    <View className="flex-1 gap-6">
      <OnboardingBearSays
        line={OnboardingSteps_bearLine(ctx)}
        mood={step.bear}
        text={OnboardingSteps_text(step.say, ctx)}
      />
      <View className="flex-row items-center gap-3 p-4 rounded-2xl" style={{ backgroundColor: C.card }}>
        <Text className="text-3xl">{reminder ? "🔔" : "❤️"}</Text>
        <View className="flex-1">
          <Text className="font-bold" style={{ color: C.text }}>
            {reminder ? "beBEAR" : "Apple Health"}
          </Text>
          <Text style={{ color: C.muted }}>
            {reminder ? "Your bear is waiting. Today's workout is ready." : "Workouts and body weight, in both apps."}
          </Text>
        </View>
      </View>
      <View className="flex-1" />
      <View className="gap-2">
        <OnboardingButton label="Maybe later" look="link" onPress={() => answer("later")} />
        <OnboardingButton label={reminder ? "Remind me" : "Connect"} onPress={() => answer("allow")} />
      </View>
    </View>
  );
}
