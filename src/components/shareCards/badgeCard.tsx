import { JSX } from "react";
import { View } from "react-native";
import { IBearBadgeInfo } from "../../models/bearBadges";
import { BadgeCoin } from "../badgeCoin";
import { ShareCardBrand, ShareCardFrame, ShareCardText } from "./cardParts";
import { ShareCardTheme as T } from "./shareCardTheme";

export function BadgeCard(props: { info: IBearBadgeInfo; onImageLoad?: (uri: string) => void }): JSX.Element {
  return (
    <ShareCardFrame background={T.green}>
      <View style={{ paddingTop: 32, alignItems: "center" }}>
        <ShareCardBrand size={44} color={T.cream} faceColor={T.green} />
      </View>
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 24 }}>
        <BadgeCoin info={props.info} isEarned={true} size={200} onImageLoad={props.onImageLoad} />
        <View style={{ height: 28 }} />
        <ShareCardText size={16} weight="semibold" color={T.honey} spacing={2}>
          BADGE UNLOCKED
        </ShareCardText>
        <ShareCardText size={36} weight="bold" align="center" style={{ marginTop: 8 }}>
          {props.info.name}
        </ShareCardText>
        <ShareCardText size={16} align="center" style={{ marginTop: 8 }}>
          {props.info.description}
        </ShareCardText>
      </View>
    </ShareCardFrame>
  );
}
