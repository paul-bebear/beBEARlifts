import { JSX, useState } from "react";
import { Image, LayoutChangeEvent, View } from "react-native";
import { IBearState } from "../models/bear";
import { BearArt_cardSprite, BearArt_gym } from "../models/bearArt";
import { IBearBoardLine, IBearBoardTarget } from "../models/bearBoard";
import { BearHouse_gymExit } from "../models/bearHouse";
import { BearScene_breathing, BearScene_breathingPivot, BearScene_layout } from "../models/bearScene";
import { BearImage_uri } from "../utils/bearImage";
import { useBearBreathing } from "../utils/useBearBreathing";
import { BearSceneBoard, BearSprite, HouseObjectView, HousePill } from "./bearSceneParts";

const maxWidth = 480;

interface IProps {
  state: IBearState;
  lines: IBearBoardLine[];
  onTarget: (target: IBearBoardTarget) => void;
  onExit: () => void;
}

// The gym, shown while a workout runs. The bear lifts, and the exit door opens the exit sheet.
export function BearScene(props: IProps): JSX.Element {
  const [width, setWidth] = useState(0);
  const { state } = props;
  const breathing = BearScene_breathing(state.mood);
  const scaleY = useBearBreathing(breathing.durationMs, breathing.scaleY);
  const spritePath = BearArt_cardSprite(state.line, state.level.tier.level);
  const gym = BearArt_gym(state.level.tier.level);
  const exit = BearHouse_gymExit(gym);
  const layout = BearScene_layout(width, state.level.tier.level, state.level.fraction, spritePath, breathing.scaleY);
  const pivot = BearScene_breathingPivot(spritePath, layout.sprite.height);
  const unit = layout.width / 1024;
  const onLayout = (e: LayoutChangeEvent): void => setWidth(Math.min(maxWidth, e.nativeEvent.layout.width));

  return (
    <View className="px-4" onLayout={onLayout}>
      {width > 0 && (
        <View
          testID="bear-scene"
          data-testid="bear-scene"
          className="self-center overflow-hidden rounded-3xl"
          style={{ width: layout.width, height: layout.height }}
        >
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
            text={exit.pill}
            center={exit.pillAt}
            unit={unit}
            sceneWidth={layout.width}
            onPress={props.onExit}
          />
        </View>
      )}
    </View>
  );
}
