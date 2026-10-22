import { JSX } from "react";
import { Pressable, View } from "react-native";
import { Text } from "./primitives/text";
import { IconClose2 } from "./icons/iconClose2";
import { IFirstUseTip } from "../models/firstUseTips";

export function TipBar(props: { tip: IFirstUseTip; onClose: () => void }): JSX.Element {
  return (
    <View
      className="flex-row items-start px-4 py-3 mx-4 my-2 border rounded-2xl bg-yellow-50 border-yellow-300"
      testID={props.tip.id}
      accessibilityRole="alert"
    >
      <Text className="flex-1 text-sm text-text-primary">{props.tip.text}</Text>
      <Pressable
        className="pl-3"
        hitSlop={12}
        accessibilityLabel="Close tip"
        testID="tip-bar-close"
        onPress={props.onClose}
      >
        <IconClose2 size={12} />
      </Pressable>
    </View>
  );
}
