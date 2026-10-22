import { JSX } from "react";
import { Image, Pressable, View } from "react-native";
import { BearScene_bodyCrop } from "../models/bearScene";
import { IBearShopCard } from "../models/bearShop";
import { BearImage_uri } from "../utils/bearImage";
import { Text } from "./primitives/text";
import { ShareCardTheme as T } from "./shareCards/shareCardTheme";

export function BearShopCard(props: { card: IBearShopCard; sprite: string; onPress: () => void }): JSX.Element {
  const crop = BearScene_bodyCrop(props.sprite, 112);
  return (
    <View className="flex-row items-center p-3 mt-3 rounded-2xl" style={{ backgroundColor: T.paper, gap: 16 }}>
      <View className="overflow-hidden" style={{ width: crop.width, height: 112 }}>
        <Image
          accessibilityLabel={props.card.name}
          source={{ uri: BearImage_uri(props.sprite) }}
          style={{ position: "absolute", ...crop.image }}
          resizeMode="contain"
        />
      </View>
      <View className="flex-1">
        <Text className="text-base font-bold" style={{ color: T.greenDark }}>
          {props.card.name}
        </Text>
        <Text className="mt-1 text-sm" style={{ color: T.greenDark }}>
          {props.card.price}
        </Text>
        <Pressable
          testID={`bear-shop-${props.card.id}`}
          accessibilityRole="button"
          accessibilityLabel={`${props.card.name}. ${props.card.button}`}
          accessibilityState={{ disabled: props.card.disabled }}
          disabled={props.card.disabled}
          onPress={props.onPress}
          className="items-center justify-center px-3 py-3 mt-3 rounded-full"
          style={{ backgroundColor: T.honey, opacity: props.card.disabled ? 0.55 : 1, minHeight: 44 }}
        >
          <Text className="text-sm font-semibold" style={{ color: T.greenDark }}>
            {props.card.button}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
