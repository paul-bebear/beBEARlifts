import { JSX, ReactNode, useEffect, useReducer, useState } from "react";
import { ActivityIndicator, Image, LayoutChangeEvent, Pressable, View } from "react-native";
import { Text } from "./primitives/text";
import { IconPause } from "./icons/iconPause";
import { IconPlay } from "./icons/iconPlay";
import { ExerciseDemos_cell, ExerciseDemos_rows, IExerciseDemoMedia } from "../models/exerciseDemos";
import {
  ExerciseDemoPlayback_delayMs,
  ExerciseDemoPlayback_initial,
  ExerciseDemoPlayback_isPlaying,
  ExerciseDemoPlayback_reduce,
  IExerciseDemoPlayback,
  IExerciseDemoPlaybackEvent,
} from "../models/exerciseDemoPlayback";
import { ExerciseDemoCache_fileName } from "../models/exerciseDemoCache";
import {
  DemoFileCache_initialUri,
  DemoFileCache_markMissing,
  DemoFileCache_store,
  DemoFileCache_touch,
} from "../utils/demoFileCache";
import { HostConfig_resolveUrl } from "../utils/hostConfig";
import { useReduceMotion } from "../utils/useReduceMotion";

interface IProps {
  name: string;
  demoKey: string;
  url: string;
  media: IExerciseDemoMedia;
  fallback: ReactNode;
}

export function ExerciseDemoPlayer(props: IProps): JSX.Element {
  const { media } = props;
  const fileName = ExerciseDemoCache_fileName(props.demoKey, media.bytes);
  const remote = HostConfig_resolveUrl(props.url);
  const [src, setSrc] = useState(() => DemoFileCache_initialUri(fileName, remote));
  const [state, send] = useReducer(
    (s: IExerciseDemoPlayback, e: IExerciseDemoPlaybackEvent) => ExerciseDemoPlayback_reduce(media, s, e),
    media,
    ExerciseDemoPlayback_initial
  );
  const [width, setWidth] = useState(0);
  const reduceMotion = useReduceMotion();
  const isPlaying = ExerciseDemoPlayback_isPlaying(state);
  const delay = ExerciseDemoPlayback_delayMs(media, state);

  useEffect(() => send({ type: "reduceMotion", enabled: reduceMotion }), [reduceMotion]);

  useEffect(() => {
    if (delay == null) {
      return undefined;
    }
    const timer = setTimeout(() => send({ type: "tick" }), delay);
    return () => clearTimeout(timer);
  }, [delay, state.frame]);

  const onLoad = (): void => {
    send({ type: "loaded" });
    if (src === remote) {
      DemoFileCache_store(fileName, remote);
    } else {
      DemoFileCache_touch(fileName);
    }
  };
  const onError = (): void => {
    if (src !== remote) {
      DemoFileCache_markMissing(fileName);
      setSrc(remote);
    } else {
      send({ type: "failed" });
    }
  };
  const onLayout = (e: LayoutChangeEvent): void => setWidth(Math.floor(e.nativeEvent.layout.width));

  if (state.load === "failed") {
    return <View testID="exercise-demo-fallback">{props.fallback}</View>;
  }

  const cell = ExerciseDemos_cell(media, state.frame);
  return (
    <View>
      <View
        onLayout={onLayout}
        className="overflow-hidden bg-white rounded-xl"
        style={{ width: "100%", aspectRatio: 1 }}
        accessible={true}
        accessibilityRole="image"
        accessibilityLabel={`${props.name} demo, ${isPlaying ? "playing" : "paused"}`}
        testID="exercise-demo"
        data-testid="exercise-demo"
      >
        {width > 0 && (
          <Image
            source={{ uri: src }}
            resizeMode="stretch"
            onLoad={onLoad}
            onError={onError}
            style={{
              position: "absolute",
              width: width * media.columns,
              height: width * ExerciseDemos_rows(media),
              left: -cell.column * width,
              top: -cell.row * width,
            }}
          />
        )}
        {state.load === "loading" && (
          <View className="absolute inset-0 items-center justify-center">
            <ActivityIndicator />
          </View>
        )}
      </View>
      <Pressable
        onPress={() => send({ type: "toggled" })}
        disabled={state.load !== "ready"}
        accessibilityRole="button"
        accessibilityLabel={isPlaying ? "Pause demo" : "Play demo"}
        accessibilityState={{ disabled: state.load !== "ready" }}
        hitSlop={8}
        className="flex-row items-center self-center px-4 py-2 mt-2 rounded-full bg-background-subtle"
        testID="exercise-demo-toggle"
        data-testid="exercise-demo-toggle"
      >
        {isPlaying ? <IconPause size={20} /> : <IconPlay size={20} />}
        <Text className="ml-2 text-base">{isPlaying ? "Pause" : "Play"}</Text>
      </Pressable>
    </View>
  );
}
