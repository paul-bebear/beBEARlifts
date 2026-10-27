import { JSX, useEffect, useState } from "react";
import { Image, View } from "react-native";
import { IBearState } from "../models/bear";
import { BearArt_sprite } from "../models/bearArt";
import { IBearBoardLine, IBearBoardTarget } from "../models/bearBoard";
import { BearHouse_art, BearHouse_tap, IBearHouseObject, IBearHouseOpenTarget } from "../models/bearHouse";
import { BearScene_breathing, BearScene_breathingPivot, BearScene_layout } from "../models/bearScene";
import { BearImage_uri } from "../utils/bearImage";
import { useBearBreathing } from "../utils/useBearBreathing";
import { BearSceneBoard, BearSprite, HouseObjectView, HousePill } from "./bearSceneParts";
import { HouseFrameView } from "./houseFrameView";

const noteMs = 3000;

interface IProps {
  state: IBearState;
  room: string;
  wall: string;
  lines: IBearBoardLine[];
  objects: IBearHouseObject[];
  onBoardTarget: (target: IBearBoardTarget) => void;
  onTarget: (target: IBearHouseOpenTarget) => void;
}

interface INote {
  id: string;
  text: string;
  at: number;
}

// The home: the room, its objects, the whiteboard and the bear, filling the screen. A padlocked object answers
// with the day it opens, for three seconds, under the object.
export function BearHouseScene(props: IProps): JSX.Element {
  return (
    <HouseFrameView testID="bear-house" wall={props.wall}>
      {(width) => <HouseArt {...props} width={width} />}
    </HouseFrameView>
  );
}

function HouseArt(props: IProps & { width: number }): JSX.Element {
  const [note, setNote] = useState<INote | undefined>(undefined);
  const { state } = props;
  const breathing = BearScene_breathing(state.mood);
  const scaleY = useBearBreathing(breathing.durationMs, breathing.scaleY);
  const spritePath = BearArt_sprite(state.line, state.fur, state.level.tier.level, state.mood);
  const layout = BearScene_layout(
    props.width,
    BearHouse_art,
    state.level.tier.level,
    state.level.fraction,
    spritePath,
    breathing.scaleY
  );
  const pivot = BearScene_breathingPivot(spritePath, layout.sprite.height);
  const unit = layout.width / BearHouse_art.canvas.width;

  useEffect(() => {
    if (note == null) {
      return;
    }
    const timer = setTimeout(() => setNote(undefined), noteMs);
    return () => clearTimeout(timer);
  }, [note]);

  const press = (object: IBearHouseObject): void => {
    const tap = BearHouse_tap(object);
    if (tap.kind === "note") {
      setNote({ id: object.id, text: tap.text, at: Date.now() });
    } else {
      props.onTarget(tap.target);
    }
  };
  const drawn = (layer: IBearHouseObject["layer"]): JSX.Element[] =>
    props.objects
      .filter((o) => o.layer === layer)
      .map((o) => <HouseObjectView key={o.id} object={o} unit={unit} onPress={press} />);
  const noteAt = props.objects.find((o) => o.id === note?.id)?.pillAt ?? {
    x: BearHouse_art.canvas.width / 2,
    y: BearHouse_art.foot.y,
  };

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
      {props.objects
        .filter((o) => o.image != null && o.lock == null && note?.id !== o.id)
        .map((o) => (
          <HousePill
            key={o.id}
            testID={`house-${o.id}-pill`}
            text={o.isNew ? "New" : o.pill}
            center={o.pillAt}
            unit={unit}
            sceneWidth={layout.width}
            onPress={() => press(o)}
          />
        ))}
      {note != null && (
        <HousePill
          key={note.at}
          testID="house-note"
          text={note.text}
          center={noteAt}
          unit={unit}
          sceneWidth={layout.width}
          isNote={true}
        />
      )}
    </View>
  );
}
