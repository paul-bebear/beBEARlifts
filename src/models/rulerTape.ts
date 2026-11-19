import { MathUtils_clamp, MathUtils_roundFloat, n } from "../utils/math";
import { IExerciseType, ISettings, IUnit } from "../types";
import { Exercise_toKey } from "./exercise";
import { Weight_build, Weight_convertTo, Weight_increment, Weight_round } from "./weight";

export type IRulerKind = "reps" | "weight" | "weighIn";
type IRulerUnit = "kg" | "lb";

export interface IRulerSpec {
  kind: IRulerKind;
  label: string;
  min: number;
  max: number;
  step: number;
  decimals: number;
  tickSpacing: number;
  tallEvery: number;
  labelEvery: number;
  startValue: number;
  stops?: number[];
}

interface IRulerTick {
  index: number;
  value: number;
  isTall: boolean;
  label?: string;
}

interface IRulerWindow {
  first: number;
  last: number;
}

interface IRulerMove {
  index: number;
  value: number;
  changed: boolean;
}

interface IRulerWidths {
  leftSpacer: number;
  rightSpacer: number;
}

type IRulerPanelMode = "ruler" | "pad";

const TICK_SPACING = 12;
const REPS_TICK_SPACING = 16;
const WINDOW_BUFFER_TICKS = 60;
const HAPTIC_MIN_GAP_MS = 20;
export const RulerTape_decelerationRate = 0.996;

const REPS: IRulerSpec = {
  kind: "reps",
  label: "reps",
  min: 0,
  max: 100,
  step: 1,
  decimals: 0,
  tickSpacing: REPS_TICK_SPACING,
  tallEvery: 5,
  labelEvery: 10,
  startValue: 8,
};

const WEIGHT_KG: IRulerSpec = {
  kind: "weight",
  label: "kg",
  min: 0,
  max: 300,
  step: 2.5,
  decimals: 1,
  tickSpacing: TICK_SPACING,
  tallEvery: 4,
  labelEvery: 8,
  startValue: 20,
};

const WEIGHT_LB: IRulerSpec = {
  kind: "weight",
  label: "lb",
  min: 0,
  max: 700,
  step: 5,
  decimals: 0,
  tickSpacing: TICK_SPACING,
  tallEvery: 2,
  labelEvery: 4,
  startValue: 45,
};

const WEIGH_IN_KG: IRulerSpec = {
  kind: "weighIn",
  label: "kg",
  min: 30,
  max: 250,
  step: 0.1,
  decimals: 1,
  tickSpacing: TICK_SPACING,
  tallEvery: 10,
  labelEvery: 10,
  startValue: 70,
};

const WEIGH_IN_LB: IRulerSpec = {
  kind: "weighIn",
  label: "lb",
  min: 60,
  max: 550,
  step: 0.2,
  decimals: 1,
  tickSpacing: TICK_SPACING,
  tallEvery: 5,
  labelEvery: 5,
  startValue: 155,
};

export function RulerTape_spec(kind: IRulerKind, unit: string | undefined): IRulerSpec | undefined {
  if (kind === "reps") {
    return REPS;
  }
  if (unit === "kg") {
    return kind === "weight" ? WEIGHT_KG : WEIGH_IN_KG;
  }
  if (unit === "lb") {
    return kind === "weight" ? WEIGHT_LB : WEIGH_IN_LB;
  }
  return undefined;
}

export const RulerTape_reps = RulerTape_spec("reps", undefined);

interface IRulerChange {
  value: number;
  text: string;
  shouldCommit: boolean;
}

export function RulerTape_applyChange(
  rulerValue: number,
  min: number | undefined,
  max: number | undefined,
  commitMode: string
): IRulerChange {
  const clamped = MathUtils_clamp(rulerValue, min, max);
  const value = isNaN(clamped) ? MathUtils_clamp(0, min, max) : clamped;
  return { value, text: value.toString(), shouldCommit: commitMode !== "blur" };
}

const STOPS_CEILING_KG = 300;
const STOPS_CEILING_LB = 700;
const STOPS_MAX_COUNT = 2000;
const STOPS_TALL_EVERY = 5;
const STOPS_LABEL_EVERY = 5;

const stopsCache = new WeakMap<ISettings, Map<string, number[]>>();

function stopsCeiling(unit: IRulerUnit, current: number | undefined): number {
  const base = unit === "kg" ? STOPS_CEILING_KG : STOPS_CEILING_LB;
  const wanted = current != null && isFinite(current) ? current * 2 : 0;
  return base * Math.max(1, Math.ceil(wanted / base));
}

function nextAchievable(cursor: number, unit: IUnit, settings: ISettings, exerciseType: IExerciseType): number {
  const raw = Weight_increment(Weight_build(cursor, unit), settings, exerciseType);
  const inUnit = raw.unit === unit ? raw : Weight_convertTo(raw, unit);
  return MathUtils_roundFloat(Weight_round(inUnit, settings, unit, exerciseType).value, 3);
}

function RulerTape_buildStops(
  settings: ISettings,
  exerciseType: IExerciseType,
  unit: IUnit,
  ceiling: number
): number[] {
  let cursor = MathUtils_roundFloat(Weight_round(Weight_build(0, unit), settings, unit, exerciseType).value, 3);
  const stops = [cursor];
  while (stops.length < STOPS_MAX_COUNT) {
    const next = nextAchievable(cursor, unit, settings, exerciseType);
    if (!(next > cursor) || next > ceiling) {
      break;
    }
    stops.push(next);
    cursor = next;
  }
  return stops;
}

function cachedStops(settings: ISettings, exerciseType: IExerciseType, unit: IUnit, ceiling: number): number[] {
  let perSettings = stopsCache.get(settings);
  if (perSettings == null) {
    perSettings = new Map();
    stopsCache.set(settings, perSettings);
  }
  const key = `${Exercise_toKey(exerciseType)}|${unit}|${ceiling}`;
  let stops = perSettings.get(key);
  if (stops == null) {
    stops = RulerTape_buildStops(settings, exerciseType, unit, ceiling);
    perSettings.set(key, stops);
  }
  return stops;
}

function nearestStopIndex(stops: number[], value: number): number {
  if (isNaN(value) || stops.length === 0) {
    return 0;
  }
  let low = 0;
  let high = stops.length - 1;
  while (low < high) {
    const mid = Math.floor((low + high) / 2);
    if (stops[mid] < value) {
      low = mid + 1;
    } else {
      high = mid;
    }
  }
  if (low > 0 && value - stops[low - 1] < stops[low] - value) {
    return low - 1;
  }
  return low;
}

export function RulerTape_weightSpec(
  settings: ISettings,
  exerciseType: IExerciseType | undefined,
  unit: string | undefined,
  current: number | undefined
): IRulerSpec | undefined {
  const flat = RulerTape_spec("weight", unit);
  if (flat == null || exerciseType == null) {
    return flat;
  }
  const rulerUnit = unit as IRulerUnit;
  const stops = cachedStops(settings, exerciseType, rulerUnit, stopsCeiling(rulerUnit, current));
  if (stops.length < 2) {
    return flat;
  }
  const last = stops[stops.length - 1];
  return {
    ...flat,
    min: stops[0],
    max: last,
    step: MathUtils_roundFloat((last - stops[0]) / (stops.length - 1), 3),
    tallEvery: STOPS_TALL_EVERY,
    labelEvery: STOPS_LABEL_EVERY,
    startValue: stops[nearestStopIndex(stops, flat.startValue)],
    stops,
  };
}

export function RulerTape_lastIndex(spec: IRulerSpec): number {
  if (spec.stops) {
    return spec.stops.length - 1;
  }
  return Math.round((spec.max - spec.min) / spec.step);
}

export function RulerTape_clampIndex(spec: IRulerSpec, index: number): number {
  if (isNaN(index)) {
    return 0;
  }
  return Math.min(RulerTape_lastIndex(spec), Math.max(0, index));
}

export function RulerTape_indexForValue(spec: IRulerSpec, value: number): number {
  if (spec.stops) {
    return nearestStopIndex(spec.stops, value);
  }
  return RulerTape_clampIndex(spec, Math.round((value - spec.min) / spec.step));
}

export function RulerTape_valueForIndex(spec: IRulerSpec, index: number): number {
  if (spec.stops) {
    return spec.stops[RulerTape_clampIndex(spec, index)];
  }
  return MathUtils_roundFloat(spec.min + RulerTape_clampIndex(spec, index) * spec.step, spec.decimals);
}

export function RulerTape_snap(spec: IRulerSpec, value: number): number {
  return RulerTape_valueForIndex(spec, RulerTape_indexForValue(spec, value));
}

export function RulerTape_offsetForIndex(spec: IRulerSpec, index: number): number {
  return RulerTape_clampIndex(spec, index) * spec.tickSpacing;
}

export function RulerTape_offsetForValue(spec: IRulerSpec, value: number): number {
  return RulerTape_offsetForIndex(spec, RulerTape_indexForValue(spec, value));
}

export function RulerTape_indexForOffset(spec: IRulerSpec, offset: number): number {
  return RulerTape_clampIndex(spec, Math.round(offset / spec.tickSpacing));
}

export function RulerTape_valueForOffset(spec: IRulerSpec, offset: number): number {
  return RulerTape_valueForIndex(spec, RulerTape_indexForOffset(spec, offset));
}

export function RulerTape_startValue(
  spec: IRulerSpec,
  current: number | undefined,
  initial: number | undefined
): number {
  return current ?? initial ?? spec.startValue;
}

export function RulerTape_parse(text: string): number | undefined {
  if (text === "") {
    return undefined;
  }
  const value = Number(text);
  return isNaN(value) ? undefined : value;
}

export function RulerTape_format(value: number): string {
  return n(value, 2);
}

export function RulerTape_tick(spec: IRulerSpec, index: number): IRulerTick {
  const value = RulerTape_valueForIndex(spec, index);
  const hasLabel = index % spec.labelEvery === 0;
  return {
    index,
    value,
    isTall: index % spec.tallEvery === 0,
    label: hasLabel ? RulerTape_format(value) : undefined,
  };
}

export function RulerTape_move(spec: IRulerSpec, lastIndex: number, offset: number): IRulerMove {
  const index = RulerTape_indexForOffset(spec, offset);
  return { index, value: RulerTape_valueForIndex(spec, index), changed: index !== lastIndex };
}

export function RulerTape_window(spec: IRulerSpec, centerIndex: number, viewportWidth: number): IRulerWindow {
  const halfTicks = Math.ceil(viewportWidth / spec.tickSpacing / 2) + WINDOW_BUFFER_TICKS;
  return {
    first: Math.max(0, centerIndex - halfTicks),
    last: Math.min(RulerTape_lastIndex(spec), centerIndex + halfTicks),
  };
}

export function RulerTape_windowNeedsShift(
  spec: IRulerSpec,
  win: IRulerWindow,
  centerIndex: number,
  viewportWidth: number
): boolean {
  const visibleHalf = Math.ceil(viewportWidth / spec.tickSpacing / 2);
  const margin = Math.floor(WINDOW_BUFFER_TICKS / 2);
  const nearStart = centerIndex - win.first < visibleHalf + margin && win.first > 0;
  const nearEnd = win.last - centerIndex < visibleHalf + margin && win.last < RulerTape_lastIndex(spec);
  return nearStart || nearEnd;
}

function RulerTape_edgePad(spec: IRulerSpec, viewportWidth: number): number {
  return Math.max(0, viewportWidth / 2 - spec.tickSpacing / 2);
}

export function RulerTape_widths(spec: IRulerSpec, win: IRulerWindow, viewportWidth: number): IRulerWidths {
  const pad = RulerTape_edgePad(spec, viewportWidth);
  return {
    leftSpacer: pad + win.first * spec.tickSpacing,
    rightSpacer: pad + (RulerTape_lastIndex(spec) - win.last) * spec.tickSpacing,
  };
}

export function RulerTape_hapticAllowed(lastMs: number, nowMs: number): boolean {
  return nowMs - lastMs >= HAPTIC_MIN_GAP_MS;
}

export function RulerTape_flickSteps(
  spec: IRulerSpec,
  velocityPtPerSec: number,
  decelerationRate: number = RulerTape_decelerationRate
): number {
  const distancePt = (Math.abs(velocityPtPerSec) / 1000) * (-1 / Math.log(decelerationRate));
  return distancePt / spec.tickSpacing;
}

export function RulerTape_flickValue(
  spec: IRulerSpec,
  velocityPtPerSec: number,
  decelerationRate: number = RulerTape_decelerationRate
): number {
  return RulerTape_flickSteps(spec, velocityPtPerSec, decelerationRate) * spec.step;
}

export function RulerTape_panelMode(hasRuler: boolean, padRequested: boolean): IRulerPanelMode {
  return hasRuler && !padRequested ? "ruler" : "pad";
}

export function RulerTape_padRequested(padForId: string | null, activeId: string | null | undefined): boolean {
  return padForId != null && padForId === activeId;
}
