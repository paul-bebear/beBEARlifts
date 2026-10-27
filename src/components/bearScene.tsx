import { JSX } from "react";
import { Image, View } from "react-native";
import { IBearState } from "../models/bear";
import { BearArt_cardSprite, BearArt_gym } from "../models/bearArt";
import { IBearBoardLine, IBearBoardTarget } from "../models/bearBoard";
import { BearHouse_gymExit, BearHouse_gymWallColor } from "../models/bearHouse";
import { BearScene_breathing, BearScene_breathingPivot, BearScene_layout } from "../models/bearScene";
import { HouseFrame_canvas, HouseFrame_gymArt } from "../models/houseFrame";
import { BearImage_uri } from "../utils/bearImage";
import { useBearBreathing } from "../utils/useBearBreathing";
import { BearSceneBoard, BearSprite, HouseObjectView, HousePill } from "./bearSceneParts";
import { HouseFrameView } from "./houseFrameView";

interface IProps {
  state: IBearState;
  lines: IBearBoardLine[];
  onTarget: (target: IBearBoardTarget) => void;
  onExit: () => void;
}

// The gym, shown while a workout runs. The bear lifts, and the exit door opens the exit sheet.
export function BearScene(props: IProps): JSX.Element {
  const gym = BearArt_gym(props.state.level.tier.level);
  return (
    <HouseFrameView testID="bear-scene" wall={BearHouse_gymWallColor(gym)}>
      {(width) => <GymArt {...props} gym={gym} width={width} />}
    </HouseFrameView>
  );
}

function GymArt(props: IProps & { gym: string; width: number }): JSX.Element {
  const { state, gym } = props;
  const breathing = BearScene_breathing(state.mood);
  const scaleY = useBearBreathing(breathing.durationMs, breathing.scaleY);
  const spritePath = BearArt_cardSprite(state.line, state.fur, state.level.tier.level);
  const exit = BearHouse_gymExit(gym);
  const layout = BearScene_layout(
    props.width,
    HouseFrame_gymArt,
    state.level.tier.level,
    state.level.fraction,
    spritePath,
    breathing.scaleY
  );
  const pivot = BearScene_breathingPivot(spritePath, layout.sprite.height);
  const unit = layout.width / HouseFrame_canvas.width;

  return (
    <View style={{ width: layout.width, height: layout.height }}>
      <Image
        source={{ uri: BearImage_uri(gym) }}
        style={{ position: "absolute", left: 0, top: 0, width: layout.width, height: layout.height }}
        resizeMode="cover"
      />
      <BearSprite spritePath={spritePath} box={layout.sprite} pivot={pivot} scaleY={scaleY} />
      <BearSceneBoard board={layout.board} lines={props.lines} onTarget={props.onTarget} />
      <HouseObjectView object={exit} unit={unit} onPress={props.onExit} />
      <HousePill
        testID="house-door-pill"
        text={exit.pill ?? exit.label}
        center={exit.pillAt}
        unit={unit}
        sceneWidth={layout.width}
        onPress={props.onExit}
      />
    </View>
  );
}
