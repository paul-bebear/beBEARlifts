import { JSX } from "react";
import { View, Pressable } from "react-native";
import { Text } from "./primitives/text";
import { IconMagnifyingGlass } from "./icons/iconMagnifyingGlass";
import { IconCamera } from "./icons/iconCamera";
import { IconBarcode } from "./icons/iconFoodUi";
import { Tailwind_semantic } from "../utils/tailwindConfig";

interface IProps {
  onSearch: () => void;
  onBarcode: () => void;
  onPhoto: () => void;
}

export function FoodSearchBar(props: IProps): JSX.Element {
  const blue = Tailwind_semantic().icon.blue;
  return (
    <View className="px-4 pt-2 pb-2 bg-background-default">
      <View className="flex-row items-center rounded-full bg-background-subtle">
        <Pressable
          className="flex-row items-center flex-1 py-3 pl-4"
          testID="food-search"
          data-testid="food-search"
          onPress={props.onSearch}
        >
          <IconMagnifyingGlass size={20} color={blue} />
          <Text className="ml-2 text-base text-text-secondary">Search for a food</Text>
        </Pressable>
        <Pressable className="px-3 py-3" testID="food-barcode" data-testid="food-barcode" onPress={props.onBarcode}>
          <IconBarcode size={24} color={blue} />
        </Pressable>
        <Pressable className="py-3 pl-2 pr-4" testID="food-photo" data-testid="food-photo" onPress={props.onPhoto}>
          <IconCamera size={24} color={blue} />
        </Pressable>
      </View>
    </View>
  );
}
