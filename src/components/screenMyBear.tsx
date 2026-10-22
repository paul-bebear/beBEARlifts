import { JSX, ReactNode } from "react";
import { Pressable, View } from "react-native";
import { Thunk_pushScreen } from "../ducks/thunks";
import { NavScreenContent } from "../navigation/NavScreenContent";
import { useTrackedDispatch } from "../navigation/TrackedStateContext";
import { useNavOptions } from "../navigation/useNavOptions";
import { Tailwind_semantic } from "../utils/tailwindConfig";
import { IconCog2 } from "./icons/iconCog2";
import { Text } from "./primitives/text";
import { ProgressSections } from "./screenProgressDashboard";

export function ScreenMyBear(props: { bearSlot?: ReactNode; checkInSlot?: ReactNode }): JSX.Element {
  const dispatch = useTrackedDispatch();
  useNavOptions({
    navTitle: "My bear",
    navRightButtons: [
      <Pressable
        key="settings"
        accessibilityRole="button"
        accessibilityLabel="Settings"
        className="p-2"
        testID="progress-settings"
        data-testid="progress-settings"
        onPress={() => dispatch(Thunk_pushScreen("settings"))}
      >
        <IconCog2 color={Tailwind_semantic().icon.neutral} size={22} />
      </Pressable>,
    ],
  });

  return (
    <NavScreenContent>
      <View testID="my-bear" data-testid="my-bear">
        <View testID="my-bear-slot" data-testid="my-bear-slot">
          {props.bearSlot ?? (
            <View className="items-center justify-center py-8">
              <Text className="text-6xl" accessibilityLabel="Your bear">
                🐻
              </Text>
            </View>
          )}
        </View>
        <View testID="my-bear-check-in-slot" data-testid="my-bear-check-in-slot">
          {props.checkInSlot}
        </View>
        <ProgressSections />
      </View>
    </NavScreenContent>
  );
}
