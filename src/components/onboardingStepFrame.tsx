import { Dispatch, JSX, ReactNode } from "react";
import { Image, Pressable, View } from "react-native";
import { IBearMood } from "../models/bear";
import { BearArt_sprite } from "../models/bearArt";
import { IBearLine } from "../models/bearStoreData";
import { IOnboardingEvent, IOnboardingState } from "../models/onboarding";
import { IOnboardingStepDef } from "../models/onboardingSteps";
import { BearImage_uri } from "../utils/bearImage";
import { Text } from "./primitives/text";

export type IOnboardingStepOf<K extends IOnboardingStepDef["kind"]> = Extract<IOnboardingStepDef, { kind: K }>;

export interface IOnboardingKindProps<K extends IOnboardingStepDef["kind"]> {
  state: IOnboardingState;
  step: IOnboardingStepOf<K>;
  emit: Dispatch<IOnboardingEvent>;
}

export const OnboardingColors = {
  bg: "#14111F",
  card: "#1D1A2B",
  border: "#2F2A45",
  picked: "#2B2436",
  pickedBorder: "#F2A93B",
  text: "#FFFFFF",
  muted: "#A39DB8",
  accent: "#F2A93B",
  accentText: "#1A1200",
  off: "#2A2638",
  offText: "#615B78",
};

const C = OnboardingColors;

export function OnboardingBear(props: { line: IBearLine; mood: IBearMood; size: number; level?: number }): JSX.Element {
  const sprite = BearArt_sprite(props.line, props.level ?? 1, props.mood);
  return (
    <Image
      accessible={false}
      source={{ uri: BearImage_uri(sprite) }}
      style={{ width: props.size, height: props.size }}
      resizeMode="contain"
    />
  );
}

export function OnboardingTitle(props: { text: string; center?: boolean; accent?: boolean }): JSX.Element | null {
  return props.text === "" ? null : (
    <Text
      accessibilityRole="header"
      className="text-3xl font-bold"
      style={{ color: props.accent ? C.accent : C.text, textAlign: props.center ? "center" : "left" }}
    >
      {props.text}
    </Text>
  );
}

export function OnboardingBody(props: { text: string; center?: boolean }): JSX.Element | null {
  return props.text === "" ? null : (
    <Text className="text-lg" style={{ color: C.muted, textAlign: props.center ? "center" : "left" }}>
      {props.text}
    </Text>
  );
}

export function OnboardingBubble(props: { text: string }): JSX.Element {
  return (
    <View
      style={{
        flex: 1,
        borderWidth: 1.5,
        borderColor: C.border,
        borderRadius: 16,
        paddingHorizontal: 14,
        paddingVertical: 10,
        minHeight: 48,
        justifyContent: "center",
      }}
    >
      <Text accessibilityRole="header" className="text-base text-center" style={{ color: C.text }}>
        {props.text}
      </Text>
    </View>
  );
}

export function OnboardingBearSays(props: { line: IBearLine; mood: IBearMood; text: string }): JSX.Element {
  return (
    <View className="flex-row items-center gap-3">
      <OnboardingBear line={props.line} mood={props.mood} size={84} />
      {props.text !== "" && <OnboardingBubble text={props.text} />}
    </View>
  );
}

export function OnboardingButton(props: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  look?: "primary" | "white" | "outline" | "link";
}): JSX.Element {
  const look = props.look ?? "primary";
  const bg = props.disabled ? C.off : look === "primary" ? C.accent : look === "white" ? "#FFFFFF" : "transparent";
  const color = props.disabled ? C.offText : look === "primary" || look === "white" ? C.accentText : C.accent;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={props.label}
      accessibilityState={{ disabled: props.disabled }}
      disabled={props.disabled}
      onPress={props.onPress}
      style={{
        width: "100%",
        paddingVertical: look === "link" ? 10 : 16,
        borderRadius: 16,
        backgroundColor: bg,
        borderWidth: look === "outline" ? 1.5 : 0,
        borderColor: C.border,
        alignItems: "center",
      }}
    >
      <Text
        className={look === "link" ? "text-sm" : "text-lg font-bold"}
        style={{ color, letterSpacing: look === "link" ? 0 : 1 }}
      >
        {look === "link" ? props.label : props.label.toUpperCase()}
      </Text>
    </Pressable>
  );
}

export function OnboardingProgress(props: { value: number }): JSX.Element {
  const percent = `${Math.round(Math.max(0.03, Math.min(1, props.value)) * 100)}%` as const;
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(props.value * 100) }}
      style={{ flex: 1, height: 12, borderRadius: 6, backgroundColor: C.off, overflow: "hidden" }}
    >
      <View style={{ width: percent, height: 12, borderRadius: 6, backgroundColor: C.accent }} />
    </View>
  );
}

export function OnboardingStepFrame(props: {
  progress?: number;
  onBack?: () => void;
  children: ReactNode;
  footer?: ReactNode;
}): JSX.Element {
  return (
    <View className="flex-1 w-full max-w-lg gap-5 mx-auto">
      {props.progress != null && (
        <View className="flex-row items-center gap-3" style={{ minHeight: 32 }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back"
            disabled={props.onBack == null}
            onPress={props.onBack}
            hitSlop={12}
            style={{ opacity: props.onBack == null ? 0 : 1, paddingRight: 4 }}
          >
            <Text className="text-2xl" style={{ color: C.muted }}>
              ←
            </Text>
          </Pressable>
          <OnboardingProgress value={props.progress} />
        </View>
      )}
      <View className="flex-1 gap-4">{props.children}</View>
      {props.footer != null && <View className="gap-2">{props.footer}</View>}
    </View>
  );
}
