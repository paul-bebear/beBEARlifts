import { JSX, ReactNode, useId } from "react";
import { Image, View } from "react-native";
import { IWorkoutShareData } from "../../models/workoutStoryCard";
import { LevelUpImage_uri } from "../../utils/levelUpImage";
import { Defs, LinearGradient, Rect, Stop, Svg } from "../primitives/svg";
import { ShareCardBrand, ShareCardFrame, ShareCardScrim, ShareCardText } from "./cardParts";
import { ShareCardTheme as T } from "./shareCardTheme";

export function LevelUpPicture(props: {
  image: string;
  onImageLoad?: (uri: string) => void;
  children: ReactNode;
}): JSX.Element {
  const gradientId = useId();
  return (
    <View style={{ flex: 1, width: "100%", backgroundColor: T.greenDark }}>
      <Image
        source={{ uri: LevelUpImage_uri(props.image) }}
        resizeMode="cover"
        onLoad={() => props.onImageLoad?.(props.image)}
        style={{ position: "absolute", width: "100%", height: "100%", top: 0, left: 0 }}
      />
      <View style={{ pointerEvents: "none", position: "absolute", top: 0, left: 0, right: 0, height: "45%" }}>
        <Svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
          <Defs>
            <LinearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#000000" stopOpacity={0.88} />
              <Stop offset="0.6" stopColor="#000000" stopOpacity={0.55} />
              <Stop offset="1" stopColor="#000000" stopOpacity={0} />
            </LinearGradient>
          </Defs>
          <Rect width={100} height={100} fill={`url(#${gradientId})`} />
        </Svg>
      </View>
      {props.children}
    </View>
  );
}

export function LevelUpCard(props: {
  data: IWorkoutShareData;
  onImageLoad?: (uri: string) => void;
}): JSX.Element | null {
  const levelUp = props.data.levelUp;
  if (levelUp == null) {
    return null;
  }
  return (
    <ShareCardFrame background={T.greenDark}>
      <LevelUpPicture image={levelUp.image} onImageLoad={props.onImageLoad}>
        <View style={{ alignItems: "center", paddingTop: 36, paddingHorizontal: 24 }}>
          <ShareCardText size={40} weight="bold" align="center" color={T.honey}>
            Level up!
          </ShareCardText>
          <ShareCardText size={28} weight="bold" align="center" style={{ marginTop: 10 }}>
            {levelUp.title}
          </ShareCardText>
        </View>
        <ShareCardScrim edge="bottom" height={140} opacity={0.75} />
        <View style={{ position: "absolute", bottom: 28, left: 0, right: 0, alignItems: "center" }}>
          <ShareCardBrand size={32} color={T.cream} faceColor={T.greenDark} />
        </View>
      </LevelUpPicture>
    </ShareCardFrame>
  );
}
