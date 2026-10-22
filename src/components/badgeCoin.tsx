import { JSX } from "react";
import { Image, View } from "react-native";
import { Text } from "./primitives/text";
import { IBearBadgeInfo } from "../models/bearBadges";
import { ShareCardTheme as T } from "./shareCards/shareCardTheme";

interface IProps {
  info: IBearBadgeInfo;
  isEarned: boolean;
  size: number;
  testID?: string;
}

const lockedFill = "#D9D6CF";
const lockedRing = "#B9B5AC";
const honeyRing = "#C98A1F";
const honeyInner = "#F7C46A";

export function BadgeCoin(props: IProps): JSX.Element {
  const { info, isEarned, size } = props;
  const inner = size * 0.78;
  const art = inner * 0.62;
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
        {info.image != null ? (
          <Image
            source={{ uri: info.image }}
            style={{ width: art, height: art, opacity: isEarned ? 1 : 0.35 }}
            resizeMode="contain"
          />
        ) : (
          <Text style={{ fontSize: art * 0.8, lineHeight: art, opacity: isEarned ? 1 : 0.35 }}>{info.emoji}</Text>
        )}
      </View>
    </View>
  );
}
