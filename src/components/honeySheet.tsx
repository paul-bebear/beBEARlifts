import { JSX } from "react";
import { Modal, Pressable, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Text } from "./primitives/text";
import { IHoneyDay } from "../models/bearHoney";
import { BearText_honeyBreakdown, BearText_honeyLine } from "../models/bearText";
import { ShareCardTheme as T } from "./shareCards/shareCardTheme";

interface IProps {
  balance: number;
  today?: IHoneyDay;
  saved?: string;
  onClose: () => void;
}

export function HoneySheet(props: IProps): JSX.Element {
  return (
    <Modal visible={true} animationType="slide" transparent={true} onRequestClose={props.onClose}>
      <Pressable
        testID="honey-sheet-backdrop"
        data-testid="honey-sheet-backdrop"
        accessibilityLabel="Close"
        onPress={props.onClose}
        className="flex-1 justify-end"
        style={{ backgroundColor: "rgba(0,0,0,0.4)" }}
      >
        <SafeAreaView edges={["bottom"]} style={{ backgroundColor: T.cream }}>
          <Pressable className="px-6 pt-6 pb-4" testID="honey-sheet" data-testid="honey-sheet">
            <Text className="text-2xl font-bold" style={{ color: T.greenDark }}>
              {BearText_honeyLine(props.balance)}
            </Text>
            {props.saved != null && (
              <Text
                className="mt-1 text-base"
                style={{ color: T.greenDark }}
                testID="honey-saved"
                data-testid="honey-saved"
              >
                {props.saved}
              </Text>
            )}
            <Text className="mt-3 text-sm font-bold tracking-wide uppercase" style={{ color: T.greenDark }}>
              Today
            </Text>
            <Text
              className="mt-1 text-base"
              style={{ color: T.greenDark }}
              testID="honey-breakdown"
              data-testid="honey-breakdown"
            >
              {BearText_honeyBreakdown(props.today)}
            </Text>
            <Text className="mt-4 text-base" style={{ color: T.greenDark }}>
              The shop opens soon
            </Text>
            <View className="mt-5">
              <Pressable
                testID="honey-sheet-close"
                data-testid="honey-sheet-close"
                accessibilityRole="button"
                onPress={props.onClose}
                className="items-center py-4 rounded-full"
                style={{ backgroundColor: T.honey }}
              >
                <Text className="text-base font-semibold" style={{ color: T.greenDark }}>
                  Got it
                </Text>
              </Pressable>
            </View>
          </Pressable>
        </SafeAreaView>
      </Pressable>
    </Modal>
  );
}
