import { JSX } from "react";
import { View } from "react-native";
import { Text } from "./primitives/text";
import { useNavOptions } from "../navigation/useNavOptions";
import { Tailwind_semantic } from "../utils/tailwindConfig";
import { IconFriends } from "./icons/iconFriends";

export function ScreenFriends(): JSX.Element {
  useNavOptions({ navTitle: "Friends" });
  return (
    <View className="items-center px-8 pt-16" testID="friends-placeholder" data-testid="friends-placeholder">
      <IconFriends size={56} color={Tailwind_semantic().icon.neutral} />
      <Text className="pt-4 text-xl font-bold text-center">Friends are coming</Text>
      <Text className="pt-2 text-base text-center text-text-secondary">
        Soon you will see your friends' workouts here, in a feed.
      </Text>
    </View>
  );
}
