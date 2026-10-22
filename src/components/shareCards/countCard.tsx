import { JSX } from "react";
import { View } from "react-native";
import { IWorkoutShareData, WorkoutStoryCard_headline, WorkoutStoryCard_summary } from "../../models/workoutStoryCard";
import { ShareCardBrand, ShareCardFrame, ShareCardText } from "./cardParts";
import { ShareCardTheme as T } from "./shareCardTheme";

export function CountCard(props: { data: IWorkoutShareData; onImageLoad?: (uri: string) => void }): JSX.Element {
  const { stats, equivalent } = props.data;
  const headline = WorkoutStoryCard_headline(stats);
  return (
    <ShareCardFrame background={T.honey}>
      <View style={{ paddingTop: 32, alignItems: "center" }}>
        <ShareCardBrand
          size={44}
          color={T.greenDark}
          faceColor={T.honey}
          bear={props.data.bear}
          onImageLoad={props.onImageLoad}
        />
      </View>
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 24 }}>
        {equivalent == null ? (
          <ShareCardText size={64} weight="bold" color={T.greenDark}>
            {`${headline.value} ${headline.unit}`}
          </ShareCardText>
        ) : (
          <>
            <ShareCardText size={18} color={T.greenDark}>
              I just lifted
            </ShareCardText>
            <ShareCardText size={80} weight="bold" color={T.greenDark} align="center">
              {equivalent.number}
            </ShareCardText>
            <ShareCardText size={28} weight="bold" color={T.greenDark} align="center">
              {equivalent.noun}
            </ShareCardText>
            <View
              style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "center", marginTop: 18, maxWidth: 260 }}
            >
              {Array.from({ length: props.data.iconCount }, (_, i) => (
                <ShareCardText key={i} size={22}>
                  {equivalent.emoji}
                </ShareCardText>
              ))}
            </View>
          </>
        )}
      </View>
      <View style={{ backgroundColor: T.greenDark, paddingVertical: 16, alignItems: "center" }}>
        <ShareCardText size={14} weight="semibold">
          {WorkoutStoryCard_summary(stats, props.data.tier.tier.name)}
        </ShareCardText>
      </View>
    </ShareCardFrame>
  );
}
