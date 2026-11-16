import { MathUtils_roundFloat, n } from "../utils/math";

export type IRulerKind = "reps" | "weight" | "weighIn";
export type IRulerUnit = "kg" | "lb";

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
}

export interface IRulerTick {
  index: number;
  value: number;
  isTall: boolean;
  label?: string;
}

export interface IRulerWindow {
  first: number;
  last: number;
}

export interface IRulerMove {
  index: number;
  value: number;
  changed: boolean;
}

export interface IRulerWidths {
  leftSpacer: number;
  rightSpacer: number;
}

export type IRulerPanelMode = "ruler" | "pad";

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

export function RulerTape_lastIndex(spec: IRulerSpec): number {
  return Math.round((spec.max - spec.min) / spec.step);
}

export function RulerTape_clampIndex(spec: IRulerSpec, index: number): number {
  if (isNaN(index)) {
    return 0;
  }
  return Math.min(RulerTape_lastIndex(spec), Math.max(0, index));
}

export function RulerTape_indexForValue(spec: IRulerSpec, value: number): number {
  return RulerTape_clampIndex(spec, Math.round((value - spec.min) / spec.step));
}

export function RulerTape_valueForIndex(spec: IRulerSpec, index: number): number {
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

export function RulerTape_edgePad(spec: IRulerSpec, viewportWidth: number): number {
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
