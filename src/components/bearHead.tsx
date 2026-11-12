import { JSX } from "react";
import { Image, View } from "react-native";
import { BearScene_headCrop } from "../models/bearScene";
import { BearImage_uri } from "../utils/bearImage";

export function BearHead(props: { sprite: string; size: number }): JSX.Element {
  return (
    <View
      className="overflow-hidden rounded-full bg-background-subtle"
      style={{ width: props.size, height: props.size }}
    >
      <Image
        source={{ uri: BearImage_uri(props.sprite) }}
        style={{ position: "absolute", ...BearScene_headCrop(props.sprite, props.size) }}
        resizeMode="contain"
      />
    </View>
  );
}
