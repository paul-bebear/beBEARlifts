import { JSX } from "react";
import { Image, View } from "react-native";
import { IShareCardBear } from "../../models/workoutStoryCard";
import { ShareCardBear_frame } from "../../models/shareCardBear";
import { BearImage_uri } from "../../utils/bearImage";

interface IProps {
  bear: IShareCardBear;
  height: number;
  onImageLoad?: (uri: string) => void;
}

// A failed load still reports, so the export captures the card without the bear instead of waiting forever.
export function ShareCardBear(props: IProps): JSX.Element {
  const frame = ShareCardBear_frame(props.bear.size, props.height);
  const done = (): void => props.onImageLoad?.(props.bear.sprite);
  return (
    <View testID="share-card-bear" style={{ width: frame.width, height: frame.height, overflow: "hidden" }}>
      <Image
        source={{ uri: BearImage_uri(props.bear.sprite) }}
        resizeMode="contain"
        onLoad={done}
        onError={done}
        style={{
          position: "absolute",
          left: 0,
          top: -frame.imageCrop,
          width: frame.imageWidth,
          height: frame.imageHeight,
        }}
      />
    </View>
  );
}
