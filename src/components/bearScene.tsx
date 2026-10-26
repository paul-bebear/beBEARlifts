import { JSX, useEffect, useRef, useState } from "react";
import { AccessibilityInfo, Animated, Easing, Image, LayoutChangeEvent, Platform, Pressable, View } from "react-native";
import { Text } from "./primitives/text";
import { IBearState } from "../models/bear";
import { BearArt_gym, BearArt_sprite } from "../models/bearArt";
import { IBearBoardLine, IBearBoardTarget } from "../models/bearBoard";
import {
  BearScene_boardInkBottom,
  BearScene_breathing,
  BearScene_breathingPivot,
  BearScene_dashboardRect,
  BearScene_layout,
} from "../models/bearScene";
import { BearImage_uri } from "../utils/bearImage";

const maxWidth = 480;
const markerInk = "#1F3A5F";
const boardTargets: IBearBoardTarget[] = ["plus", "bear"];

interface IProps {
  state: IBearState;
  lines: IBearBoardLine[];
  onTarget: (target: IBearBoardTarget) => void;
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
          {line.isDone && (
            <Text style={{ color: markerInk, fontSize: size * 0.85, lineHeight: size }} className="font-bold">
              ✓
            </Text>
          )}
        </View>
      )}
      <Text
        numberOfLines={1}
        className={isTodo ? "font-bold" : undefined}
        style={{
          flexShrink: 1,
          color: markerInk,
          opacity: isTodo ? 1 : 0.75,
          fontSize: size,
          lineHeight: size * 1.2,
          textDecorationLine: line.isDone ? "line-through" : "none",
        }}
      >
        {line.text}
      </Text>
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

export function BearScene(props: IProps): JSX.Element {
  const [width, setWidth] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(true);
  const scaleY = useRef(new Animated.Value(1)).current;
  const { state } = props;
  const breathing = BearScene_breathing(state.mood);
  const spritePath = BearArt_sprite(state.line, state.level.tier.level, state.mood);
  const layout = BearScene_layout(width, state.level.tier.level, state.level.fraction, spritePath, breathing.scaleY);
  const pivot = BearScene_breathingPivot(spritePath, layout.sprite.height);
  const onLayout = (e: LayoutChangeEvent): void => setWidth(Math.min(maxWidth, e.nativeEvent.layout.width));
  const pad = layout.board.width * 0.04;
  const [, boardTop, , boardBottom] = BearScene_dashboardRect;
  const inkHeight = layout.board.height * ((BearScene_boardInkBottom - boardTop) / (boardBottom - boardTop));
  const lineSize = Math.max(11, Math.round(inkHeight * 0.085));

  useEffect(() => {
    let active = true;
    let changed = false;
    const subscription = AccessibilityInfo.addEventListener("reduceMotionChanged", (enabled) => {
      changed = true;
      setReduceMotion(enabled);
    });
    AccessibilityInfo.isReduceMotionEnabled().then(
      (enabled) => {
        if (active && !changed) {
          setReduceMotion(enabled);
        }
      },
      () => {}
    );
    return () => {
      active = false;
      subscription?.remove();
    };
  }, []);

  useEffect(() => {
    scaleY.setValue(1);
    if (reduceMotion) {
      return;
    }
    const timing = {
      duration: breathing.durationMs / 2,
      easing: Easing.inOut(Easing.sin),
      useNativeDriver: Platform.OS !== "web",
      isInteraction: false,
    };
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(scaleY, { ...timing, toValue: breathing.scaleY }),
        Animated.timing(scaleY, { ...timing, toValue: 1 }),
      ])
    );
    animation.start();
    return () => {
      animation.stop();
      scaleY.setValue(1);
    };
  }, [reduceMotion, breathing.durationMs, breathing.scaleY, scaleY]);

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
            source={{ uri: BearImage_uri(BearArt_gym(state.level.tier.level)) }}
            style={{ position: "absolute", left: 0, top: 0, width: layout.width, height: layout.height }}
            resizeMode="cover"
          />
          <Animated.Image
            testID="bear-scene-sprite"
            source={{ uri: BearImage_uri(spritePath) }}
            style={{
              position: "absolute",
              ...layout.sprite,
              transform: [{ translateY: pivot }, { scaleY }, { translateY: -pivot }],
            }}
            resizeMode="contain"
          />
          <View
            className="justify-between"
            style={{
              position: "absolute",
              left: layout.board.left + pad,
              top: layout.board.top + pad,
              width: layout.board.width - 2 * pad,
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
        </View>
      )}
    </View>
  );
}
