import { JSX, ReactNode } from "react";
import { Pressable } from "react-native";
import { Text } from "./primitives/text";
import { TextInput } from "./primitives/textInput";

const chip = "flex-row items-center w-full p-4 border-2 rounded-2xl";
const pill = "px-4 py-2 border-2 rounded-full";
const on = "border-yellow-500 bg-background-cardyellow";
const off = "border-border-prominent";

export function OnboardingChip(props: {
  on: boolean;
  onPress: () => void;
  children: ReactNode;
  role?: "switch";
  disabled?: boolean;
}): JSX.Element {
  return (
    <Pressable
      className={`${chip} ${props.on ? on : off}`}
      style={{ gap: 12 }}
      accessibilityRole={props.role ?? "button"}
      accessibilityState={props.role === "switch" ? { checked: props.on } : { selected: props.on }}
      disabled={props.disabled}
      onPress={props.onPress}
    >
      {props.children}
    </Pressable>
  );
}

export function OnboardingPill(props: { on: boolean; label: string; onPress: () => void }): JSX.Element {
  return (
    <Pressable
      className={`${pill} ${props.on ? on : off}`}
      accessibilityRole="button"
      accessibilityState={{ selected: props.on }}
      onPress={props.onPress}
    >
      <Text>{props.label}</Text>
    </Pressable>
  );
}

export function OnboardingField(props: {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  keyboard?: "number-pad" | "decimal-pad";
  maxLength?: number;
  plain?: boolean;
}): JSX.Element {
  return (
    <TextInput
      className="flex-1 p-3 border rounded-xl bg-background-default border-border-prominent text-text-primary"
      accessibilityLabel={props.label}
      value={props.value}
      keyboardType={props.keyboard}
      maxLength={props.maxLength}
      autoCapitalize={props.plain ? "none" : undefined}
      autoCorrect={props.plain ? false : undefined}
      onChangeText={props.onChange}
    />
  );
}

export function OnboardingLink(props: { label: string; onPress: () => void; disabled?: boolean }): JSX.Element {
  return (
    <Pressable className="self-start py-2" accessibilityRole="button" disabled={props.disabled} onPress={props.onPress}>
      <Text className="text-text-link">{props.label}</Text>
    </Pressable>
  );
}

export function OnboardingMainButton(props: {
  label: string;
  enabled: boolean;
  onPress: () => void;
  testID?: string;
}): JSX.Element {
  return (
    <Pressable
      testID={props.testID}
      className="w-full p-4 bg-yellow-400 rounded-2xl"
      style={{ opacity: props.enabled ? 1 : 0.4 }}
      accessibilityRole="button"
      accessibilityState={{ disabled: !props.enabled }}
      disabled={!props.enabled}
      onPress={props.onPress}
    >
      <Text className="text-lg font-bold text-center text-black">{props.label}</Text>
    </Pressable>
  );
}
