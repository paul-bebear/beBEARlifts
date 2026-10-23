import { JSX } from "react";
import { Modal, Pressable, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { IBearState } from "../models/bear";
import { IPendingWake } from "../models/bearStoreData";
import { HibernationPass_wakeText } from "../models/hibernationPass";
import { BearAvatar } from "./bearAvatar";
import { Text } from "./primitives/text";
import { ShareCardTheme as T } from "./shareCards/shareCardTheme";

interface IProps {
  state: IBearState;
  pendingWake: IPendingWake;
  passesLeft: number;
  onClose: () => void;
}

export function HibernationWakeSheet(props: IProps): JSX.Element {
  const text = HibernationPass_wakeText(props.pendingWake, props.passesLeft);
  return (
    <Modal visible={true} animationType="slide" transparent={true} onRequestClose={props.onClose}>
      <View className="flex-1 justify-end" style={{ backgroundColor: "rgba(0,0,0,0.4)" }}>
        <SafeAreaView edges={["bottom"]} style={{ backgroundColor: T.cream }}>
          <View
            className="items-center px-6 pt-6 pb-4"
            testID="hibernation-wake-sheet"
            data-testid="hibernation-wake-sheet"
          >
            <BearAvatar state={{ ...props.state, mood: "tired" }} size={120} />
            <Text className="mt-4 text-2xl font-bold text-center" style={{ color: T.greenDark }}>
              {text.title}
            </Text>
            <Text className="mt-3 text-base text-center" style={{ color: T.greenDark }}>
              {text.body}
            </Text>
            <Pressable
              testID="hibernation-wake-close"
              data-testid="hibernation-wake-close"
              accessibilityRole="button"
              onPress={props.onClose}
              className="items-center w-full py-4 mt-5 rounded-full"
              style={{ backgroundColor: T.honey }}
            >
              <Text className="text-base font-semibold" style={{ color: T.greenDark }}>
                {text.button}
              </Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}
