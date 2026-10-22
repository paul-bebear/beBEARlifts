import { JSX, ReactNode, useEffect, useRef, useState } from "react";
import { AccessibilityInfo, Animated, Easing, Image, LayoutChangeEvent, Platform, Pressable, View } from "react-native";
import { Text } from "./primitives/text";
import { IBearState } from "../models/bear";
import { BearArt_gym, BearArt_wornSprite } from "../models/bearArt";
import { IBearBoardTile } from "../models/bearBoard";
import { BearScene_breathing, BearScene_breathingPivot, BearScene_layout, IBearBox } from "../models/bearScene";
import { BearTv_box } from "../models/bearTv";
import { BearImage_uri } from "../utils/bearImage";
import { BearStore } from "../utils/bearStore";

const maxWidth = 480;
const markerInk = "#1F3A5F";

interface IProps {
  state: IBearState;
  tiles: IBearBoardTile[];
  onTile: (tile: IBearBoardTile) => void;
  tv?: (box: IBearBox) => ReactNode;
}

function BoardTile(props: { tile: IBearBoardTile; valueSize: number; onPress: () => void }): JSX.Element {
  return (
    <Pressable
      testID={`bear-board-${props.tile.id}`}
      data-testid={`bear-board-${props.tile.id}`}
      onPress={props.onPress}
      className="justify-center p-1"
      style={{ width: "50%", height: "50%" }}
    >
      <Text
        className="font-bold"
        numberOfLines={1}
        style={{ color: markerInk, fontSize: props.valueSize, lineHeight: props.valueSize * 1.2 }}
      >
        {props.tile.value}
      </Text>
      <Text numberOfLines={1} style={{ color: markerInk, opacity: 0.7, fontSize: Math.max(10, props.valueSize * 0.5) }}>
        {props.tile.label}
      </Text>
    </Pressable>
  );
}

export function BearScene(props: IProps): JSX.Element {
  const [width, setWidth] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(true);
  const scaleY = useRef(new Animated.Value(1)).current;
  const { state } = props;
  const breathing = BearScene_breathing(state.mood);
  const store = BearStore.use();
  const spritePath = BearArt_wornSprite(state.line, state.level.tier.level, state.mood, store.equipped);
  const layout = BearScene_layout(width, state.level.tier.level, state.level.fraction, spritePath, breathing.scaleY);
  const pivot = BearScene_breathingPivot(spritePath, layout.sprite.height);
  const onLayout = (e: LayoutChangeEvent): void => setWidth(Math.min(maxWidth, e.nativeEvent.layout.width));
  const pad = layout.board.width * 0.04;
  const tvBox = BearTv_box(layout.width);

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
          <View
            className="flex-row flex-wrap"
            style={{
              position: "absolute",
              left: layout.board.left + pad,
              top: layout.board.top + pad,
              width: layout.board.width - 2 * pad,
              height: layout.board.height - 2 * pad,
            }}
          >
            {props.tiles.map((tile) => (
              <BoardTile
                key={tile.id}
                tile={tile}
                valueSize={Math.round(layout.board.height * 0.12)}
                onPress={() => props.onTile(tile)}
              />
            ))}
          </View>
          {props.tv != null && <View style={{ position: "absolute", ...tvBox }}>{props.tv(tvBox)}</View>}
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
        </View>
      )}
    </View>
  );
}
