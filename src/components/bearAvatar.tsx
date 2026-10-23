import { JSX } from "react";
import { Image, View } from "react-native";
import { IBearState } from "../models/bear";
import { BearArt_wornSprite } from "../models/bearArt";
import { BearScene_headCrop } from "../models/bearScene";
import { BearImage_uri } from "../utils/bearImage";
import { BearStore } from "../utils/bearStore";
import { ShareCardTheme as T } from "./shareCards/shareCardTheme";

export function BearAvatar(props: { state: IBearState; size: number }): JSX.Element {
  const store = BearStore.use();
  const sprite = BearArt_wornSprite(props.state.line, props.state.level.tier.level, props.state.mood, store.equipped);
  const crop = BearScene_headCrop(sprite, props.size);
  return (
    <View
      className="overflow-hidden rounded-full"
      style={{ width: props.size, height: props.size, backgroundColor: T.honey }}
    >
      <Image source={{ uri: BearImage_uri(sprite) }} style={{ position: "absolute", ...crop }} resizeMode="contain" />
    </View>
  );
}
