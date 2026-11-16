import { JSX, memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Tailwind_semantic } from "../utils/tailwindConfig";
import {
  IRulerSpec,
  RulerTape_format,
  RulerTape_indexForValue,
  RulerTape_move,
  RulerTape_offsetForValue,
  RulerTape_startValue,
  RulerTape_tick,
  RulerTape_widths,
  RulerTape_window,
  RulerTape_windowNeedsShift,
} from "../models/rulerTape";

const READY_DELAY_MS = 250;
const TALL_TICK_HEIGHT = 40;
const SHORT_TICK_HEIGHT = 24;
const TAPE_HEIGHT = 72;
const LABEL_WIDTH = 48;
const DEFAULT_VIEWPORT_WIDTH = 360;

export interface IRulerPickerProps {
  spec: IRulerSpec;
  getValue: () => number | undefined;
  initialValue?: number;
  onChange: (value: number) => void;
  onPressNumber: () => void;
}

export const RulerPicker = memo(function RulerPicker(props: IRulerPickerProps): JSX.Element {
  const { spec } = props;
  const tapeRef = useRef<HTMLDivElement>(null);
  const start = useRef(RulerTape_startValue(spec, props.getValue(), props.initialValue)).current;
  const lastIndexRef = useRef(RulerTape_indexForValue(spec, start));
  const readyRef = useRef(false);
  const onChangeRef = useRef(props.onChange);
  onChangeRef.current = props.onChange;
  const [shown, setShown] = useState(start);
  const [viewportWidth, setViewportWidth] = useState(DEFAULT_VIEWPORT_WIDTH);
  const [win, setWin] = useState(() => RulerTape_window(spec, lastIndexRef.current, DEFAULT_VIEWPORT_WIDTH));
  const winRef = useRef(win);
  winRef.current = win;
  const viewportWidthRef = useRef(viewportWidth);
  viewportWidthRef.current = viewportWidth;

  useLayoutEffect(() => {
    const tape = tapeRef.current;
    if (!tape) {
      return;
    }
    const width = tape.clientWidth > 0 ? tape.clientWidth : DEFAULT_VIEWPORT_WIDTH;
    setViewportWidth(width);
    setWin(RulerTape_window(spec, lastIndexRef.current, width));
  }, [spec]);

  useLayoutEffect(() => {
    const tape = tapeRef.current;
    if (tape) {
      tape.scrollLeft = RulerTape_offsetForValue(spec, start);
    }
  }, [spec, start, viewportWidth]);

  useEffect(() => {
    const timer = setTimeout(() => {
      readyRef.current = true;
    }, READY_DELAY_MS);
    return () => clearTimeout(timer);
  }, []);

  const onScroll = useCallback(() => {
    const tape = tapeRef.current;
    if (!tape || !readyRef.current) {
      return;
    }
    const move = RulerTape_move(spec, lastIndexRef.current, tape.scrollLeft);
    if (!move.changed) {
      return;
    }
    lastIndexRef.current = move.index;
    setShown(move.value);
    onChangeRef.current(move.value);
    if (RulerTape_windowNeedsShift(spec, winRef.current, move.index, viewportWidthRef.current)) {
      setWin(RulerTape_window(spec, move.index, viewportWidthRef.current));
    }
  }, [spec]);

  const widths = RulerTape_widths(spec, win, viewportWidth);
  const indices = useMemo(
    () => Array.from({ length: win.last - win.first + 1 }, (_, i) => win.first + i),
    [win.first, win.last]
  );

  return (
    <div>
      <button
        type="button"
        data-testid="ruler-number"
        className="flex items-end justify-center w-full pt-2 touch-manipulation"
        onClick={props.onPressNumber}
      >
        <span className="text-6xl font-bold text-text-primary">{RulerTape_format(shown)}</span>
        <span className="pb-3 pl-2 text-lg font-semibold text-text-secondary">{spec.label}</span>
      </button>
      <div className="relative" style={{ height: TAPE_HEIGHT }}>
        <div
          ref={tapeRef}
          data-testid="ruler-tape"
          onScroll={onScroll}
          className="flex w-full h-full"
          style={{
            overflowX: "scroll",
            scrollSnapType: "x mandatory",
            scrollbarWidth: "none",
            overflowAnchor: "none",
            WebkitOverflowScrolling: "touch",
          }}
        >
          <div style={{ flex: "none", width: widths.leftSpacer }} />
          {indices.map((index) => (
            <Tick key={index} spec={spec} index={index} />
          ))}
          <div style={{ flex: "none", width: widths.rightSpacer }} />
        </div>
        <div
          className="absolute pointer-events-none"
          style={{
            backgroundColor: Tailwind_semantic().icon.blue,
            left: viewportWidth / 2 - 1,
            top: 0,
            width: 2,
            height: TALL_TICK_HEIGHT + 8,
            borderRadius: 1,
          }}
        />
      </div>
    </div>
  );
});

interface ITickProps {
  spec: IRulerSpec;
  index: number;
}

const Tick = memo(function Tick(props: ITickProps): JSX.Element {
  const tick = RulerTape_tick(props.spec, props.index);
  const spacing = props.spec.tickSpacing;
  return (
    <div
      className="relative flex justify-center"
      style={{ flex: "none", width: spacing, height: TAPE_HEIGHT, scrollSnapAlign: "center" }}
    >
      <div
        style={{
          backgroundColor: Tailwind_semantic().icon.neutralsubtle,
          width: tick.isTall ? 2 : 1,
          height: tick.isTall ? TALL_TICK_HEIGHT : SHORT_TICK_HEIGHT,
        }}
      />
      {tick.label != null && (
        <div
          className="absolute text-xs text-center pointer-events-none text-text-secondary"
          style={{ top: TALL_TICK_HEIGHT + 4, width: LABEL_WIDTH, left: (spacing - LABEL_WIDTH) / 2 }}
        >
          {tick.label}
        </div>
      )}
    </div>
  );
});
