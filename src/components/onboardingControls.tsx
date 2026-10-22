import { JSX, ReactNode } from "react";
import { Pressable, View } from "react-native";
import { Text } from "./primitives/text";
import { TextInput } from "./primitives/textInput";

export const OnboardingControls_field =
  "w-full p-3 border rounded-xl bg-background-default border-border-prominent text-text-primary";

export function OnboardingChoice(props: {
  children: ReactNode;
  selected: boolean;
  onPress: () => void;
  label?: string;
  pill?: boolean;
  disabled?: boolean;
  radio?: boolean;
}): JSX.Element {
  return (
    <Pressable
      accessibilityRole={props.radio ? "radio" : "button"}
      accessibilityLabel={props.label}
      accessibilityState={{
        selected: props.selected,
        checked: props.radio ? props.selected : undefined,
        disabled: props.disabled,
      }}
      disabled={props.disabled}
      onPress={props.onPress}
      className={`${props.pill ? "px-4 py-3 rounded-full" : "w-full p-4 rounded-2xl"} border-2 ${
        props.selected ? "border-yellow-500 bg-background-cardyellow" : "border-border-prominent"
      }`}
    >
      {props.children}
    </Pressable>
  );
}

export function OnboardingAction(props: {
  children: ReactNode;
  onPress: () => void;
  disabled?: boolean;
  primary?: boolean;
}): JSX.Element {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: props.disabled }}
      disabled={props.disabled}
      onPress={props.onPress}
      className={props.primary ? "w-full p-4 rounded-2xl bg-yellow-400" : "self-start py-3"}
      style={{ opacity: props.disabled ? 0.4 : 1 }}
    >
      <Text className={props.primary ? "text-lg font-bold text-center text-black" : "text-text-link"}>
        {props.children}
      </Text>
    </Pressable>
  );
}

export function OnboardingNumber(props: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  decimal?: boolean;
}): JSX.Element {
  return (
    <View className="gap-2" style={{ flexShrink: 1 }}>
      <Text>{props.label}</Text>
      <TextInput
        accessibilityLabel={props.label}
        className={OnboardingControls_field}
        keyboardType={props.decimal ? "decimal-pad" : "number-pad"}
        value={props.value}
        onChangeText={props.onChange}
      />
    </View>
  );
}
