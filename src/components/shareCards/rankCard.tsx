import { JSX } from "react";
import { View } from "react-native";
import { IWorkoutShareData, WorkoutStoryCard_setsText, WorkoutStoryCard_summary } from "../../models/workoutStoryCard";
import { ShareCardBrand, ShareCardFrame, ShareCardProgress, ShareCardText } from "./cardParts";
import { ShareCardBear } from "./shareCardBear";
import { ShareCardTheme as T } from "./shareCardTheme";

// The tallest bear that leaves the two-line level name, the progress bar and the badge pill on a 640px card.
const bearHeight = 240;
const ringSize = 200;

export function RankCard(props: { data: IWorkoutShareData; onImageLoad?: (uri: string) => void }): JSX.Element {
  const { stats, tier, badge } = props.data;
  return (
    <ShareCardFrame background={T.green}>
      <View style={{ paddingTop: 28, alignItems: "center" }}>
        <ShareCardBrand size={36} color={T.cream} faceColor={T.green} fur={props.data.bear.fur} />
      </View>
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 24 }}>
        <ShareCardText size={13} weight="semibold" color={T.honey} spacing={3}>
          {tier.isTierUp ? "NEW RANK" : "RANK"}
        </ShareCardText>
        <View style={{ marginTop: 12, height: bearHeight, alignItems: "center", justifyContent: "flex-end" }}>
          <View
            style={{
              position: "absolute",
              bottom: 0,
              width: ringSize,
              height: ringSize,
              borderRadius: ringSize / 2,
              borderWidth: 4,
              borderColor: T.honey,
              backgroundColor: "rgba(251,243,226,0.08)",
            }}
          />
          <ShareCardBear bear={props.data.bear} height={bearHeight} onImageLoad={props.onImageLoad} />
        </View>
        <ShareCardText size={44} weight="bold" align="center" style={{ marginTop: 12 }}>
          {tier.tier.name.toUpperCase()}
        </ShareCardText>
        <ShareCardText size={15} style={{ marginTop: 6, opacity: 0.85 }}>
          {WorkoutStoryCard_summary(stats, WorkoutStoryCard_setsText(stats.sets))}
        </ShareCardText>
        <View style={{ marginTop: 22 }}>
          <ShareCardProgress fraction={tier.fraction} color={T.honey} track="rgba(251,243,226,0.2)" width={240} />
        </View>
        <ShareCardText size={13} style={{ marginTop: 8, opacity: 0.8 }}>
          {props.data.toNext}
        </ShareCardText>
      </View>
      <View style={{ alignItems: "center", paddingBottom: 30 }}>
        {badge.badge != null && (
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
              backgroundColor: T.cream,
              borderRadius: 22,
              paddingHorizontal: 16,
              paddingVertical: 8,
            }}
          >
            <ShareCardText size={20}>{badge.badge.emoji}</ShareCardText>
            <ShareCardText size={14} weight="bold" color={T.green}>
              {badge.isNew ? `NEW BADGE · ${badge.badge.name}` : badge.badge.name}
            </ShareCardText>
          </View>
        )}
        <ShareCardText size={12} style={{ marginTop: 10, opacity: 0.7 }}>
          {`${badge.earned} of ${badge.total} badges`}
        </ShareCardText>
      </View>
    </ShareCardFrame>
  );
}
