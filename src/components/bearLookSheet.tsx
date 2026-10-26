import { JSX } from "react";
import { Modal, Pressable, View } from "react-native";
import { Text } from "./primitives/text";
import { Button } from "./button";
import { BearLook_furs, BearLook_lines } from "../models/bearLook";
import { IBearFur, IBearLine } from "../models/bearStoreData";
import { ShareCardTheme as T } from "./shareCards/shareCardTheme";

interface IProps {
  line: IBearLine;
  fur: IBearFur;
  onLine: (line: IBearLine) => void;
  onFur: (fur: IBearFur) => void;
  onClose: () => void;
}

function Chip(props: { testID: string; label: string; isOn: boolean; onPress: () => void }): JSX.Element {
  return (
    <Pressable
      testID={props.testID}
      data-testid={props.testID}
      accessibilityRole="radio"
      accessibilityState={{ checked: props.isOn }}
      onPress={props.onPress}
      className={`px-4 py-2 rounded-full ${props.isOn ? "" : "border border-border-neutral"}`}
      style={props.isOn ? { backgroundColor: T.honey } : undefined}
    >
      <Text className="text-base font-semibold">{props.label}</Text>
    </Pressable>
  );
}

export function BearLookSheet(props: IProps): JSX.Element {
  return (
    <Modal transparent={true} animationType="slide" onRequestClose={props.onClose}>
      <View className="justify-end flex-1" style={{ backgroundColor: "rgba(0,0,0,0.4)" }}>
        <Pressable
          accessibilityLabel="Close your bear"
          accessibilityRole="button"
          className="flex-1"
          onPress={props.onClose}
        />
        <View
          className="p-6 pb-10 rounded-t-2xl bg-background-default"
          accessibilityViewIsModal={true}
          testID="bear-look-sheet"
          data-testid="bear-look-sheet"
          style={{ gap: 12 }}
        >
          <Text className="text-xl font-bold">Your bear</Text>
          <Text className="text-base font-semibold">Line</Text>
          <View className="flex-row" style={{ gap: 8 }}>
            {BearLook_lines.map((choice) => (
              <Chip
                key={choice.value}
                testID={`bear-look-line-${choice.value}`}
                label={choice.label}
                isOn={props.line === choice.value}
                onPress={() => props.onLine(choice.value)}
              />
            ))}
          </View>
          <Text className="text-base font-semibold">Fur</Text>
          <View className="flex-row" style={{ gap: 8 }}>
            {BearLook_furs.map((choice) => (
              <Chip
                key={choice.value}
                testID={`bear-look-fur-${choice.value}`}
                label={choice.label}
                isOn={props.fur === choice.value}
                onPress={() => props.onFur(choice.value)}
              />
            ))}
          </View>
          <Button name="bear-look-close" kind="pill-outline" onPress={props.onClose}>
            Done
          </Button>
        </View>
      </View>
    </Modal>
  );
}
