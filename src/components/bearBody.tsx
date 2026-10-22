import { JSX } from "react";
import { Image, View } from "react-native";
import { BearScene_bodyCrop } from "../models/bearScene";
import { BearImage_uri } from "../utils/bearImage";

export function BearBody(props: { sprite: string; height: number; testID?: string }): JSX.Element {
  const crop = BearScene_bodyCrop(props.sprite, props.height);
  return (
    <View
      testID={props.testID}
      data-testid={props.testID}
      className="overflow-hidden"
      style={{ width: crop.width, height: props.height }}
    >
      <Image
        source={{ uri: BearImage_uri(props.sprite) }}
        style={{ position: "absolute", ...crop.image }}
        resizeMode="contain"
      />
    </View>
  );
}
