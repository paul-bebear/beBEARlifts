import { JSX } from "react";
import { Image, View } from "react-native";
import { IScreenMuscle } from "../../types";
import { IWorkoutShareData, WorkoutStoryCard_headline, WorkoutStoryCard_isLoaded } from "../../models/workoutStoryCard";
import { FrontMusclesSvg } from "../muscles/images/frontMusclesSvg";
import { BackMusclesSvg, IMuscleStyle } from "../muscles/images/backMusclesSvg";
import { ShareCardBrand, ShareCardFrame, ShareCardScrim, ShareCardText } from "./cardParts";
import { ShareCardTheme as T } from "./shareCardTheme";

interface IProps {
  data: IWorkoutShareData;
  photo?: string;
  onPhotoLoad?: (photo: string) => void;
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
    <View style={{ alignItems: "center", minWidth: 90 }}>
      <ShareCardText size={30} weight="bold">
        {props.value}
      </ShareCardText>
      <ShareCardText size={11} weight="semibold" spacing={2} style={{ opacity: 0.85 }}>
        {props.label}
      </ShareCardText>
    </View>
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
      {photo != null && (
        <Image
          source={{ uri: photo }}
          resizeMode="cover"
          onLoad={() => props.onPhotoLoad?.(photo)}
          style={{ position: "absolute", top: 0, left: 0, width: T.width, height: T.height }}
        />
      )}
      <ShareCardScrim edge="top" height={300} opacity={photo != null ? 0.75 : 0.3} />
      <ShareCardScrim edge="bottom" height={300} opacity={photo != null ? 0.85 : 0.3} />
      <View style={{ alignItems: "center", paddingTop: 26 }}>
        <ShareCardBrand size={32} color={T.cream} faceColor={T.green} />
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
          {WorkoutStoryCard_isLoaded(stats) && <Stat label="SETS" value={`${stats.sets}`} />}
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
