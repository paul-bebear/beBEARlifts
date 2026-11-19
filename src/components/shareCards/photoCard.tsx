import { JSX } from "react";
import { View } from "react-native";
import { IScreenMuscle } from "../../types";
import {
  IWorkoutShareData,
  WorkoutStoryCard_headline,
  WorkoutStoryCard_hasWeight,
} from "../../models/workoutStoryCard";
import { FrontMusclesSvg } from "../muscles/images/frontMusclesSvg";
import { BackMusclesSvg, IMuscleStyle } from "../muscles/images/backMusclesSvg";
import { ShareCardBrand, ShareCardFrame, ShareCardPhotoBackground, ShareCardStat, ShareCardText } from "./cardParts";
import { ShareCardTheme as T } from "./shareCardTheme";

interface IProps {
  data: IWorkoutShareData;
  photo?: string;
  onImageLoad?: (uri: string) => void;
}

function muscleStyles(levels: Partial<Record<IScreenMuscle, number>>): Partial<Record<IScreenMuscle, IMuscleStyle>> {
  const styles: Partial<Record<IScreenMuscle, IMuscleStyle>> = {};
  for (const [muscle, level] of Object.entries(levels) as [IScreenMuscle, number][]) {
    styles[muscle] = { fill: T.honey, opacity: 0.25 + level * 0.75 };
  }
  return styles;
}

function Stat(props: { label: string; value: string }): JSX.Element {
  return (
    <ShareCardStat label={props.label} value={props.value} valueSize={30} labelSize={11} style={{ minWidth: 90 }} />
  );
}

export function PhotoCard(props: IProps): JSX.Element {
  const { stats, equivalent } = props.data;
  const headline = WorkoutStoryCard_headline(stats);
  const muscles = muscleStyles(props.data.muscles);
  const contour = { fill: T.cream, opacity: 0.85 };
  const photo = props.photo;
  const mapWidth = photo != null ? 44 : 100;
  return (
    <ShareCardFrame background={T.green}>
      <ShareCardPhotoBackground photo={photo} topHeight={300} bottomHeight={300} onImageLoad={props.onImageLoad} />
      <View style={{ alignItems: "center", paddingTop: 16 }}>
        <ShareCardBrand
          size={32}
          color={T.cream}
          faceColor={T.green}
          bear={props.data.bear}
          onImageLoad={props.onImageLoad}
        />
        <ShareCardText size={12} weight="semibold" spacing={3} style={{ marginTop: 12, opacity: 0.85 }}>
          {headline.label}
        </ShareCardText>
        <ShareCardText size={72} weight="bold" style={{ marginTop: 2 }}>
          {headline.value}
          <ShareCardText size={26} weight="bold">{` ${headline.unit}`}</ShareCardText>
        </ShareCardText>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginTop: 4 }}>
          <Stat label="TIME" value={stats.duration} />
          {photo != null && (
            <View style={{ flexDirection: "row", gap: 6 }}>
              <View style={{ width: mapWidth }}>
                <FrontMusclesSvg muscles={muscles} contour={contour} defaultOpacity={0.12} />
              </View>
              <View style={{ width: mapWidth }}>
                <BackMusclesSvg muscles={muscles} contour={contour} defaultOpacity={0.12} />
              </View>
            </View>
          )}
          {WorkoutStoryCard_hasWeight(stats) && <Stat label="SETS" value={`${stats.sets}`} />}
        </View>
      </View>
      {photo == null && (
        <View style={{ flexDirection: "row", justifyContent: "center", gap: 20, marginTop: 20 }}>
          <View style={{ width: mapWidth }}>
            <FrontMusclesSvg muscles={muscles} contour={contour} defaultOpacity={0.12} />
          </View>
          <View style={{ width: mapWidth }}>
            <BackMusclesSvg muscles={muscles} contour={contour} defaultOpacity={0.12} />
          </View>
        </View>
      )}
      <View
        style={{ position: "absolute", left: 0, right: 0, bottom: 28, alignItems: "center", paddingHorizontal: 24 }}
      >
        {equivalent != null && (
          <>
            <ShareCardText size={40}>{equivalent.emoji}</ShareCardText>
            <ShareCardText size={16} weight="semibold" align="center">
              {equivalent.lead}
            </ShareCardText>
            <ShareCardText size={28} weight="bold" align="center">
              {`${equivalent.number} ${equivalent.noun}`}
            </ShareCardText>
            {equivalent.tail !== "" && (
              <ShareCardText size={16} weight="semibold" align="center">
                {equivalent.tail}
              </ShareCardText>
            )}
          </>
        )}
        <ShareCardText size={13} weight="semibold" color={T.honey} spacing={2} style={{ marginTop: 10 }}>
          {props.data.tier.tier.name.toUpperCase()}
        </ShareCardText>
      </View>
    </ShareCardFrame>
  );
}
