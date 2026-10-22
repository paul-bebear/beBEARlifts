import { JSX } from "react";
import { View } from "react-native";
import { IWorkoutShareData } from "../../models/workoutStoryCard";
import { ShareCardBrand, ShareCardFrame, ShareCardText } from "./cardParts";
import { ShareCardTheme as T } from "./shareCardTheme";

const barWidths = [2, 1, 3, 1, 2, 2, 1, 3, 1, 1, 2, 3, 1, 2, 1, 3, 2, 1, 1, 2, 3, 1, 2, 1, 2, 3, 1, 1, 2, 1];

function Row(props: { left: string; right: string; size?: number; bold?: boolean }): JSX.Element {
  const size = props.size ?? 13;
  const weight = props.bold ? "bold" : "regular";
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 8 }}>
      <ShareCardText size={size} weight={weight} color={T.ink} numberOfLines={1} style={{ flex: 1 }}>
        {props.left}
      </ShareCardText>
      <ShareCardText size={size} weight={weight} color={T.ink}>
        {props.right}
      </ShareCardText>
    </View>
  );
}

function Dashes(): JSX.Element {
  return <View style={{ borderTopWidth: 1, borderStyle: "dashed", borderColor: "#9A9488", marginVertical: 12 }} />;
}

export function ReceiptCard(props: { data: IWorkoutShareData; onImageLoad?: (uri: string) => void }): JSX.Element {
  const receipt = props.data.receipt;
  return (
    <ShareCardFrame background={T.green} style={{ padding: 24 }}>
      <View style={{ flex: 1, backgroundColor: T.paper, borderRadius: 6, padding: 20 }}>
        <View style={{ alignItems: "center" }}>
          <ShareCardBrand
            size={30}
            color={T.green}
            faceColor={T.paper}
            bear={props.data.bear}
            onImageLoad={props.onImageLoad}
          />
          <ShareCardText size={12} color={T.ink} spacing={1} style={{ marginTop: 6, opacity: 0.7 }}>
            {`${receipt.title.toUpperCase()} · ${receipt.date.toUpperCase()}`}
          </ShareCardText>
        </View>
        <Dashes />
        <View style={{ gap: 6 }}>
          {receipt.lines.map((line, i) => (
            <Row key={i} left={`${line.name} ${line.detail}`} right={line.volume} />
          ))}
          {receipt.moreCount > 0 && <Row left={`+ ${receipt.moreCount} more`} right="" />}
          {receipt.prCount > 0 && <Row left="PR BONUS" right={`★ ${receipt.prCount}`} />}
        </View>
        <Dashes />
        <Row left="TOTAL" right={receipt.total} size={18} bold={true} />
        <ShareCardText size={12} color={T.ink} style={{ marginTop: 4, opacity: 0.7 }}>
          PAID IN: SWEAT
        </ShareCardText>
        <View style={{ flex: 1 }} />
        <View style={{ flexDirection: "row", justifyContent: "center", height: 44, gap: 2 }}>
          {barWidths.map((w, i) => (
            <View key={i} style={{ width: w * 2, backgroundColor: T.ink }} />
          ))}
        </View>
        <ShareCardText size={12} color={T.ink} align="center" spacing={2} style={{ marginTop: 8 }}>
          THANK YOU FOR LIFTING WITH beBEAR
        </ShareCardText>
      </View>
    </ShareCardFrame>
  );
}
