import type { JSX } from "react";
import { Image, Pressable, View } from "react-native";
import { Text } from "./primitives/text";
import { useTrackedDispatch, useTrackedState } from "../navigation/TrackedStateContext";
import { buildNavCommon } from "../navigation/utils";
import { navigateToModal } from "../navigation/navigationService";
import { Thunk_startProgramDay } from "../ducks/thunks";
import { QuickActions_list } from "../models/quickActions";
import { ImagePreloader_dynocoach, ImagePreloader_uri } from "../utils/imagePreloader";

export function HistoryRecordsNullState(): JSX.Element {
  const state = useTrackedState();
  const dispatch = useTrackedDispatch();
  const { workout } = QuickActions_list({
    isOngoingProgress: buildNavCommon(state).isOngoingProgress,
    canRecordRun: false,
  });
  const start = (): void => {
    if (workout.action === "resume") {
      dispatch(Thunk_startProgramDay());
    } else {
      navigateToModal("nextWorkoutModal");
    }
  };
  return (
    <View className="flex-1">
      <View className="items-center justify-center flex-1">
        <Image
          source={{ uri: ImagePreloader_uri(ImagePreloader_dynocoach) }}
          style={{ width: 160, height: 240 }}
          resizeMode="contain"
        />
      </View>
      <Pressable
        accessibilityRole="button"
        testID="start-first-workout"
        onPress={start}
        className="items-center w-full py-4 border border-border-cardpurple bg-background-cardpurple rounded-tl-2xl rounded-se-2xl"
      >
        <Text className="py-2 text-base font-semibold">Welcome to beBEAR!</Text>
        <Text className="text-sm">Start your first workout</Text>
      </Pressable>
    </View>
  );
}
