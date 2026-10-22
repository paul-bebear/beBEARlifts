import { JSX } from "react";
import { View } from "react-native";
import { Text } from "./primitives/text";
import { Button } from "./button";
import { useTrackedDispatch } from "../navigation/TrackedStateContext";
import { Thunk_pushScreen } from "../ducks/thunks";

export function FoodAiSignIn(): JSX.Element {
  const dispatch = useTrackedDispatch();
  return (
    <View className="py-3" testID="food-ai-sign-in" data-testid="food-ai-sign-in">
      <Text className="mb-3 text-sm text-text-secondary">Sign in to use AI food estimates.</Text>
      <Button
        name="food-ai-open-settings"
        kind="pill"
        className="flex-1"
        onPress={() => dispatch(Thunk_pushScreen("settings", undefined, { tab: "graphs" }))}
      >
        Open Settings
      </Button>
    </View>
  );
}
