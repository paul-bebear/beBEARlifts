import { JSX } from "react";
import { View } from "react-native";
import { IBearFur } from "../../models/bearStoreData";
import { CubNumber_shareText } from "../../models/cubNumber";
import { BearMark } from "./bearMark";
import { ShareCardBrand, ShareCardFrame, ShareCardText } from "./cardParts";
import { ShareCardTheme as T } from "./shareCardTheme";

export interface ICubCardData {
  number: number;
  handle?: string;
  fur?: IBearFur;
}

export function CubCard(props: { data: ICubCardData }): JSX.Element {
  const text = CubNumber_shareText(props.data.number, props.data.handle);
  const digits = `${props.data.number}`.length;
  const numberSize = digits <= 3 ? 112 : digits === 4 ? 92 : 72;
  return (
    <ShareCardFrame background={T.green}>
      <View style={{ paddingTop: 32, alignItems: "center" }}>
        <ShareCardBrand size={36} color={T.cream} faceColor={T.green} fur={props.data.fur} />
      </View>
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 24 }}>
        <BearMark size={150} color={T.honey} faceColor={T.green} fur={props.data.fur} />
        <ShareCardText size={20} weight="semibold" color={T.honey} spacing={3} style={{ marginTop: 24 }}>
          CUB
        </ShareCardText>
        <ShareCardText size={numberSize} weight="bold" color={T.cream} spacing={-3} numberOfLines={1}>
          {`${props.data.number}`}
        </ShareCardText>
        <ShareCardText size={24} weight="bold" align="center" style={{ marginTop: 12 }}>
          {text.title}
        </ShareCardText>
        {text.handle != null && (
          <ShareCardText size={18} color={T.honey} align="center" style={{ marginTop: 8 }}>
            {text.handle}
          </ShareCardText>
        )}
      </View>
    </ShareCardFrame>
  );
}
