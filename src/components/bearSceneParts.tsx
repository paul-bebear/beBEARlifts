import { JSX } from "react";
import { Animated, Image, Pressable, View, ViewStyle } from "react-native";
import { Text, TextRaw } from "./primitives/text";
import { BearTv } from "./bearTv";
import { IBearBoardLine, IBearBoardTarget } from "../models/bearBoard";
import {
  BearHouse_box,
  BearHouse_hitSlop,
  BearHouse_image,
  BearHouse_lockLine,
  BearHouse_padlock,
  BearHouse_pillLeft,
  BearHouse_pillWidth,
  IBearHouseObject,
} from "../models/bearHouse";
import { BearScene_boardInkBottom, BearScene_dashboardRect, IBearBox } from "../models/bearScene";
import { BearImage_uri } from "../utils/bearImage";

const markerInk = "#1F3A5F";
const pillInk = "#3B2414";
const pillPaper = "rgba(255, 250, 240, 0.94)";
const markerFont = "PermanentMarker-Regular";
const boardTargets: IBearBoardTarget[] = ["plus", "goal", "bear"];
const padlockImage = BearHouse_image("padlock");

interface ITickStroke {
  centerX: number;
  centerY: number;
  length: number;
  degrees: number;
}

const tickStrokes: ITickStroke[] = [
  { centerX: 0.32, centerY: 0.62, length: 0.28, degrees: -45 },
  { centerX: 0.61, centerY: 0.5, length: 0.58, degrees: 45 },
];

function tickStrokeStyle(stroke: ITickStroke, size: number): ViewStyle {
  const width = Math.max(2, size * 0.14);
  const length = stroke.length * size;
  return {
    position: "absolute",
    left: stroke.centerX * size - width / 2,
    top: stroke.centerY * size - length / 2,
    width,
    height: length,
    borderRadius: width / 2,
    backgroundColor: markerInk,
    transform: [{ rotate: `${stroke.degrees}deg` }],
  };
}

function BoardLine(props: { line: IBearBoardLine; size: number }): JSX.Element {
  const { line, size } = props;
  const isTodo = line.target === "plus";
  return (
    <View
      testID={`bear-board-${line.id}`}
      data-testid={`bear-board-${line.id}`}
      className="flex-row items-center"
      style={{ height: size * 1.45 }}
    >
      {isTodo && (
        <View
          className="items-center justify-center mr-1.5 rounded"
          style={{ width: size, height: size, borderWidth: 1.5, borderColor: markerInk }}
        >
          {line.isDone && tickStrokes.map((stroke, i) => <View key={i} style={tickStrokeStyle(stroke, size)} />)}
        </View>
      )}
      <TextRaw
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.8}
        style={{
          flex: 1,
          fontFamily: markerFont,
          color: markerInk,
          opacity: isTodo ? 1 : 0.75,
          fontSize: size,
          lineHeight: size * 1.2,
          textDecorationLine: line.isDone ? "line-through" : "none",
        }}
      >
        {line.text}
      </TextRaw>
    </View>
  );
}

function BoardGroup(props: {
  target: IBearBoardTarget;
  lines: IBearBoardLine[];
  size: number;
  onPress: () => void;
}): JSX.Element {
  return (
    <Pressable
      testID={`bear-board-${props.target}`}
      data-testid={`bear-board-${props.target}`}
      accessibilityRole="button"
      accessibilityLabel={props.lines.map((l) => (l.isDone ? `${l.text}, done` : l.text)).join(". ")}
      onPress={props.onPress}
    >
      {props.lines.map((line) => (
        <BoardLine key={line.id} line={line} size={props.size} />
      ))}
    </Pressable>
  );
}

export function BearSceneBoard(props: {
  board: IBearBox;
  lines: IBearBoardLine[];
  onTarget: (target: IBearBoardTarget) => void;
}): JSX.Element {
  const { board } = props;
  const pad = board.width * 0.04;
  const [, boardTop, , boardBottom] = BearScene_dashboardRect;
  const inkHeight = board.height * ((BearScene_boardInkBottom - boardTop) / (boardBottom - boardTop));
  const lineSize = Math.max(11, Math.round(inkHeight * 0.085));
  return (
    <View
      className="justify-between"
      style={{
        position: "absolute",
        left: board.left + pad,
        top: board.top + pad,
        width: board.width - 2 * pad,
        height: inkHeight - pad,
      }}
    >
      {boardTargets.map((target) => (
        <BoardGroup
          key={target}
          target={target}
          lines={props.lines.filter((l) => l.target === target)}
          size={lineSize}
          onPress={() => props.onTarget(target)}
        />
      ))}
    </View>
  );
}

export function BearSprite(props: {
  spritePath: string;
  box: IBearBox;
  pivot: number;
  scaleY: Animated.Value;
}): JSX.Element {
  return (
    <View pointerEvents="none" style={{ position: "absolute", left: 0, top: 0, right: 0, bottom: 0 }}>
      <Animated.Image
        testID="bear-scene-sprite"
        source={{ uri: BearImage_uri(props.spritePath) }}
        style={{
          position: "absolute",
          ...props.box,
          transform: [{ translateY: props.pivot }, { scaleY: props.scaleY }, { translateY: -props.pivot }],
        }}
        resizeMode="contain"
      />
    </View>
  );
}

function Overlay(props: { object: IBearHouseObject; unit: number }): JSX.Element | null {
  const overlay = props.object.overlay;
  if (overlay == null) {
    return null;
  }
  const box = BearHouse_box(overlay.rect, props.unit);
  if (overlay.kind === "tv") {
    return <BearTv box={box} />;
  }
  const isBadge = overlay.kind === "badge";
  const size = isBadge ? Math.min(box.width, box.height) : Math.min(box.height * 0.7, box.width * 0.5);
  return (
    <View
      pointerEvents="none"
      className="items-center justify-center"
      style={{
        position: "absolute",
        ...box,
        ...(isBadge ? { width: size, height: size, borderRadius: size / 2, backgroundColor: "#DC2626" } : {}),
      }}
    >
      <Text
        className="font-bold"
        style={{ color: isBadge ? "#FFFFFF" : "#1F2937", fontSize: isBadge ? size * 0.6 : size, lineHeight: size }}
      >
        {overlay.text}
      </Text>
    </View>
  );
}

export function HouseObjectView(props: {
  object: IBearHouseObject;
  unit: number;
  onPress: (object: IBearHouseObject) => void;
}): JSX.Element | null {
  const { object, unit } = props;
  if (object.image == null) {
    return null;
  }
  const box = BearHouse_box(object.rect, unit);
  const padlock = BearHouse_box(BearHouse_padlock(object.rect), unit);
  const label = object.lock == null ? object.pill : `${object.label}, ${BearHouse_lockLine(object.lock)}`;
  return (
    <>
      <Pressable
        testID={`house-${object.id}`}
        data-testid={`house-${object.id}`}
        accessibilityRole="button"
        accessibilityLabel={label}
        hitSlop={BearHouse_hitSlop(box)}
        onPress={() => props.onPress(object)}
        style={{ position: "absolute", ...box }}
      >
        <Image
          source={{ uri: BearImage_uri(object.image) }}
          style={{ width: box.width, height: box.height }}
          resizeMode="stretch"
        />
      </Pressable>
      <Overlay object={object} unit={unit} />
      {object.lock != null && (
        <View pointerEvents="none" style={{ position: "absolute", ...padlock }}>
          <Image
            testID={`house-${object.id}-padlock`}
            source={{ uri: BearImage_uri(padlockImage) }}
            style={{ width: padlock.width, height: padlock.height }}
            resizeMode="contain"
          />
        </View>
      )}
    </>
  );
}

export function HousePill(props: {
  testID: string;
  text: string;
  center: { x: number; y: number };
  unit: number;
  sceneWidth: number;
  isNote?: boolean;
  onPress?: () => void;
}): JSX.Element {
  const fontSize = Math.max(10, Math.round(26 * props.unit));
  const height = Math.round(fontSize * 1.9);
  const width = Math.min(props.sceneWidth - 8, BearHouse_pillWidth(props.text, fontSize));
  return (
    <Pressable
      testID={props.testID}
      data-testid={props.testID}
      accessibilityRole={props.onPress == null ? "text" : "button"}
      disabled={props.onPress == null}
      onPress={props.onPress}
      className="items-center justify-center"
      style={{
        position: "absolute",
        left: BearHouse_pillLeft(props.center.x * props.unit, width, props.sceneWidth),
        top: props.center.y * props.unit - height / 2,
        width,
        height,
        borderRadius: height / 2,
        backgroundColor: props.isNote ? "rgba(31, 41, 55, 0.92)" : pillPaper,
      }}
    >
      <Text
        numberOfLines={1}
        className="font-semibold"
        style={{ color: props.isNote ? "#FFFFFF" : pillInk, fontSize, lineHeight: fontSize * 1.2 }}
      >
        {props.text}
      </Text>
    </Pressable>
  );
}
