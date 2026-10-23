import { JSX, useState } from "react";
import { Image, View } from "react-native";
import { Text } from "./primitives/text";
import { BearBadges_image, IBearBadgeInfo } from "../models/bearBadges";
import { BearImage_uri } from "../utils/bearImage";
import { ShareCardTheme as T } from "./shareCards/shareCardTheme";

interface IProps {
  info: IBearBadgeInfo;
  isEarned: boolean;
  size: number;
  testID?: string;
  onImageLoad?: (uri: string) => void;
}

const lockedFill = "#D9D6CF";
const lockedRing = "#B9B5AC";
const honeyRing = "#C98A1F";
const honeyInner = "#F7C46A";

export function BadgeCoin(props: IProps): JSX.Element {
  const { info, isEarned, size } = props;
  const [failedImage, setFailedImage] = useState<string>();
  const image = BearBadges_image(info, isEarned);
  const inner = size * 0.78;
  const art = inner * 0.62;
  if (image != null && image !== failedImage) {
    return (
      <Image
        testID={props.testID}
        data-testid={props.testID}
        source={{ uri: BearImage_uri(image) }}
        style={{ width: size, height: size, opacity: isEarned ? 1 : 0.55 }}
        resizeMode="contain"
        onLoad={() => props.onImageLoad?.(image)}
        onError={() => {
          setFailedImage(image);
          props.onImageLoad?.(image);
        }}
      />
    );
  }
  return (
    <View
      testID={props.testID}
      data-testid={props.testID}
      className="items-center justify-center"
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: isEarned ? T.honey : lockedFill,
        borderWidth: Math.max(2, size * 0.05),
        borderColor: isEarned ? honeyRing : lockedRing,
      }}
    >
      <View
        className="items-center justify-center"
        style={{
          width: inner,
          height: inner,
          borderRadius: inner / 2,
          backgroundColor: isEarned ? honeyInner : lockedRing,
          opacity: isEarned ? 1 : 0.55,
        }}
      >
        <Text style={{ fontSize: art * 0.8, lineHeight: art, opacity: isEarned ? 1 : 0.35 }}>{info.emoji}</Text>
      </View>
    </View>
  );
}
