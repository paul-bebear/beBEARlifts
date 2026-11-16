import { JSX, memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Dimensions,
  LayoutChangeEvent,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  View,
} from "react-native";
import ReactNativeHapticFeedback from "react-native-haptic-feedback";
import { Text } from "./primitives/text";
import { Tailwind_semantic } from "../utils/tailwindConfig";
import {
  IRulerSpec,
  RulerTape_decelerationRate,
  RulerTape_format,
  RulerTape_hapticAllowed,
  RulerTape_indexForValue,
  RulerTape_move,
  RulerTape_offsetForValue,
  RulerTape_startValue,
  RulerTape_tick,
  RulerTape_widths,
  RulerTape_window,
  RulerTape_windowNeedsShift,
} from "../models/rulerTape";

const HAPTIC_OPTIONS = { enableVibrateFallback: false, ignoreAndroidSystemSettings: false };
const READY_DELAY_MS = 250;
const TALL_TICK_HEIGHT = 40;
const SHORT_TICK_HEIGHT = 24;
const TAPE_HEIGHT = 72;
const LABEL_WIDTH = 48;

export interface IRulerPickerProps {
  spec: IRulerSpec;
  getValue: () => number | undefined;
  initialValue?: number;
  onChange: (value: number) => void;
  onPressNumber: () => void;
}

export const RulerPicker = memo(function RulerPicker(props: IRulerPickerProps): JSX.Element {
  const { spec, onChange } = props;
  const colors = Tailwind_semantic();
  const start = useRef(RulerTape_startValue(spec, props.getValue(), props.initialValue)).current;
  const lastIndexRef = useRef(RulerTape_indexForValue(spec, start));
  const lastHapticRef = useRef(0);
  const readyRef = useRef(false);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const [shown, setShown] = useState(start);
  const [viewportWidth, setViewportWidth] = useState(Dimensions.get("window").width);
  const [win, setWin] = useState(() => RulerTape_window(spec, lastIndexRef.current, viewportWidth));
  const winRef = useRef(win);
  winRef.current = win;
  const viewportWidthRef = useRef(viewportWidth);
  viewportWidthRef.current = viewportWidth;

  useEffect(() => {
    const timer = setTimeout(() => {
      readyRef.current = true;
    }, READY_DELAY_MS);
    return () => clearTimeout(timer);
  }, []);

  const onLayout = useCallback(
    (e: LayoutChangeEvent) => {
      const width = e.nativeEvent.layout.width;
      if (width > 0 && width !== viewportWidthRef.current) {
        setViewportWidth(width);
        setWin(RulerTape_window(spec, lastIndexRef.current, width));
      }
    },
    [spec]
  );

  const onScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (!readyRef.current) {
        return;
      }
      const move = RulerTape_move(spec, lastIndexRef.current, e.nativeEvent.contentOffset.x);
      if (!move.changed) {
        return;
      }
      lastIndexRef.current = move.index;
      const now = Date.now();
      if (RulerTape_hapticAllowed(lastHapticRef.current, now)) {
        lastHapticRef.current = now;
        ReactNativeHapticFeedback.trigger("impactLight", HAPTIC_OPTIONS);
      }
      setShown(move.value);
      onChangeRef.current(move.value);
      if (RulerTape_windowNeedsShift(spec, winRef.current, move.index, viewportWidthRef.current)) {
        setWin(RulerTape_window(spec, move.index, viewportWidthRef.current));
      }
    },
    [spec]
  );

  const widths = RulerTape_widths(spec, win, viewportWidth);
  const contentOffset = useMemo(() => ({ x: RulerTape_offsetForValue(spec, start), y: 0 }), [spec, start]);
  const indices = useMemo(
    () => Array.from({ length: win.last - win.first + 1 }, (_, i) => win.first + i),
    [win.first, win.last]
  );

  return (
    <View>
      <Pressable
        onPress={props.onPressNumber}
        testID="ruler-number"
        data-testid="ruler-number"
        className="flex-row items-end justify-center pt-2"
      >
        <Text className="text-6xl font-bold text-text-primary">{RulerTape_format(shown)}</Text>
        <Text className="pb-3 pl-2 text-lg font-semibold text-text-secondary">{spec.label}</Text>
      </Pressable>
      <View style={{ height: TAPE_HEIGHT }} onLayout={onLayout}>
        <ScrollView
          testID="ruler-tape"
          horizontal
          showsHorizontalScrollIndicator={false}
          snapToInterval={spec.tickSpacing}
          snapToAlignment="start"
          decelerationRate={RulerTape_decelerationRate}
          scrollEventThrottle={16}
          contentOffset={contentOffset}
          onScroll={onScroll}
          bounces={false}
        >
          <View style={{ width: widths.leftSpacer }} />
          {indices.map((index) => (
            <Tick key={index} spec={spec} index={index} color={colors.icon.neutralsubtle} />
          ))}
          <View style={{ width: widths.rightSpacer }} />
        </ScrollView>
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            left: viewportWidth / 2 - 1,
            top: 0,
            width: 2,
            height: TALL_TICK_HEIGHT + 8,
            backgroundColor: colors.icon.blue,
            borderRadius: 1,
          }}
        />
      </View>
    </View>
  );
});

interface ITickProps {
  spec: IRulerSpec;
  index: number;
  color: string;
}

const Tick = memo(function Tick(props: ITickProps): JSX.Element {
  const tick = RulerTape_tick(props.spec, props.index);
  const spacing = props.spec.tickSpacing;
  return (
    <View style={{ width: spacing, height: TAPE_HEIGHT, alignItems: "center" }}>
      <View
        style={{
          width: tick.isTall ? 2 : 1,
          height: tick.isTall ? TALL_TICK_HEIGHT : SHORT_TICK_HEIGHT,
          backgroundColor: props.color,
        }}
      />
      {tick.label != null && (
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            top: TALL_TICK_HEIGHT + 4,
            width: LABEL_WIDTH,
            left: (spacing - LABEL_WIDTH) / 2,
          }}
        >
          <Text className="text-xs text-center text-text-secondary" numberOfLines={1}>
            {tick.label}
          </Text>
        </View>
      )}
    </View>
  );
});
