import { JSX, useState } from "react";
import { Image, View } from "react-native";
import { IBearState } from "../models/bear";
import { BearArt_sprite } from "../models/bearArt";
import { IBearBoardLine, IBearBoardTarget } from "../models/bearBoard";
import { BearHouse_art, IBearHouseObject, IBearHouseTarget } from "../models/bearHouse";
import { BearScene_breathing, BearScene_breathingPivot, BearScene_layout, IBearSceneArt } from "../models/bearScene";
import { HouseArrange_initial, HouseArrange_scene, IHouseArrangeState } from "../models/houseArrange";
import { BearImage_uri } from "../utils/bearImage";
import { HouseArrangeFlag_isOn } from "../utils/houseArrangeFlag";
import { useBearBreathing } from "../utils/useBearBreathing";
import { BearSceneBoard, BearSprite, HouseObjectView, HousePill } from "./bearSceneParts";
import { HouseArrange } from "./houseArrange";
import { HouseFrameView } from "./houseFrameView";

interface IProps {
  state: IBearState;
  room: string;
  wall: string;
  lines: IBearBoardLine[];
  objects: IBearHouseObject[];
  onBoardTarget: (target: IBearBoardTarget) => void;
  onTarget: (target: IBearHouseTarget) => void;
}

export function BearHouseScene(props: IProps): JSX.Element {
  const [arrange, setArrange] = useState<IHouseArrangeState | undefined>(() =>
    HouseArrangeFlag_isOn() ? HouseArrange_initial() : undefined
  );
  const shown = arrange != null ? HouseArrange_scene(arrange) : { ...props, art: BearHouse_art };
  return (
    <HouseFrameView testID="bear-house" wall={shown.wall}>
      {(width) => <HouseArt {...props} {...shown} width={width} arrange={arrange} onArrange={setArrange} />}
    </HouseFrameView>
  );
}

interface IArtProps extends IProps {
  width: number;
  art: IBearSceneArt;
  arrange: IHouseArrangeState | undefined;
  onArrange: (state: IHouseArrangeState) => void;
}

function HouseArt(props: IArtProps): JSX.Element {
  const { state } = props;
  const breathing = BearScene_breathing(state.mood);
  const scaleY = useBearBreathing(breathing.durationMs, breathing.scaleY);
  const spritePath = BearArt_sprite(state.line, state.fur, state.level.tier.level, state.mood);
  const layout = BearScene_layout(props.width, props.art);
  const pivot = BearScene_breathingPivot(spritePath, layout.sprite.height);
  const unit = layout.width / props.art.canvas.width;

  const press = (object: IBearHouseObject): void => props.onTarget(object.target);
  const drawn = (layer: IBearHouseObject["layer"]): JSX.Element[] =>
    props.objects
      .filter((o) => o.layer === layer)
      .map((o) => <HouseObjectView key={o.id} object={o} unit={unit} onPress={press} />);

  return (
    <View style={{ width: layout.width, height: layout.height }}>
      <Image
        source={{ uri: BearImage_uri(props.room) }}
        style={{ position: "absolute", left: 0, top: 0, width: layout.width, height: layout.height }}
        resizeMode="cover"
      />
      {drawn("back")}
      <BearSprite spritePath={spritePath} box={layout.sprite} pivot={pivot} scaleY={scaleY} />
      {drawn("front")}
      <BearSceneBoard board={layout.board} lines={props.lines} onTarget={props.onBoardTarget} />
      {props.objects.map((o) =>
        o.pill == null ? null : (
          <HousePill
            key={o.id}
            testID={`house-${o.id}-pill`}
            text={o.pill}
            center={o.pillAt}
            unit={unit}
            sceneWidth={layout.width}
            onPress={() => press(o)}
          />
        )
      )}
      {props.arrange != null && (
        <HouseArrange state={props.arrange} objects={props.objects} unit={unit} onChange={props.onArrange} />
      )}
    </View>
  );
}
