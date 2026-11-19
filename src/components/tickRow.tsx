import { JSX } from "react";
import { Pressable, View } from "react-native";
import { Text } from "./primitives/text";
import { CheckedSet_toggle } from "../models/checkedSet";
import { Tailwind_semantic } from "../utils/tailwindConfig";

export function TickRow(props: { testID: string; label: string; isTicked: boolean; onPress: () => void }): JSX.Element {
  const color = Tailwind_semantic().icon.neutral;
  return (
    <Pressable
      testID={props.testID}
      data-testid={props.testID}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: props.isTicked }}
      onPress={props.onPress}
      className="flex-row items-center py-3"
      style={{ gap: 12 }}
    >
      <View
        className="items-center justify-center rounded-md"
        style={{ width: 24, height: 24, borderWidth: 2, borderColor: color }}
      >
        {props.isTicked && <Text className="font-bold">✓</Text>}
      </View>
      <Text className="text-base">{props.label}</Text>
    </Pressable>
  );
}

export const TickRow_toggle = CheckedSet_toggle;
