import { JSX } from "react";
import { View } from "react-native";
import {
  IShareCardPage,
  IShareCardStyle,
  IWorkoutShareData,
  WorkoutStoryCard_styles,
} from "../../models/workoutStoryCard";
import { RankCard } from "./rankCard";
import { ReceiptCard } from "./receiptCard";
import { CountCard } from "./countCard";
import { PhotoCard } from "./photoCard";
import { ShareCardTheme as T } from "./shareCardTheme";

interface IProps {
  page: IShareCardPage;
  data: IWorkoutShareData;
  photo?: string;
  onPhotoLoad?: (photo: string) => void;
}

function Card(props: IProps & { page: IShareCardStyle }): JSX.Element {
  switch (props.page) {
    case "rank":
      return <RankCard data={props.data} />;
    case "receipt":
      return <ReceiptCard data={props.data} />;
    case "count":
      return <CountCard data={props.data} />;
    case "photo":
      return <PhotoCard data={props.data} photo={props.photo} onPhotoLoad={props.onPhotoLoad} />;
  }
}

// Each cell is 180x320 and holds a full 360x640 card at half scale, so the collage is one 360x640 card too.
function Collage(props: Omit<IProps, "page">): JSX.Element {
  const half = { width: T.width / 2, height: T.height / 2 };
  return (
    <View
      style={{ width: T.width, height: T.height, flexDirection: "row", flexWrap: "wrap", backgroundColor: T.green }}
    >
      {WorkoutStoryCard_styles.map((style) => (
        <View key={style} style={{ ...half, overflow: "hidden" }}>
          <View
            style={{
              width: T.width,
              height: T.height,
              transform: [{ translateX: -T.width / 4 }, { translateY: -T.height / 4 }, { scale: 0.5 }],
            }}
          >
            <Card {...props} page={style} />
          </View>
        </View>
      ))}
    </View>
  );
}

export function WorkoutSharePage(props: IProps): JSX.Element {
  return props.page === "collage" ? <Collage {...props} /> : <Card {...props} page={props.page} />;
}
