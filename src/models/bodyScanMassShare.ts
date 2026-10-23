import { IStatsWeightValue } from "../types";
import type { IBodyScanRead } from "./bodyScanRead";
import {
  BodyScans_fields,
  BodyScans_formatValue,
  BodyScans_fromForm,
  BodyScans_massIn,
  BodyScans_shareKeys,
  IBodyScan,
  IBodyScanField,
  IBodyScanForm,
  IBodyScanLog,
  IBodyScanShareKey,
  IBodyScanUnit,
} from "./bodyScans";

export type IBodyScanShareMode = "mass" | "percent";

export type IBodyScanShareModes = Partial<Record<IBodyScanShareKey, IBodyScanShareMode>>;

// A weigh-in older than this says too little about the body weight on the day of the scan.
const maxWeightGapMs = 30 * 24 * 3600 * 1000;

export function BodyScanMassShare_isShareKey(key: string): key is IBodyScanShareKey {
  return (BodyScans_shareKeys as string[]).includes(key);
}

function oneDecimal(value: number): string {
  return `${Math.round(value * 10) / 10}`;
}

function readNumber(text: string | undefined): number | undefined {
  const value = Number((text ?? "").trim().replace(",", "."));
  return (text ?? "").trim() !== "" && isFinite(value) && value > 0 ? value : undefined;
}

export function BodyScanMassShare_toMass(percent: number, bodyWeight: number): number {
  return (percent * bodyWeight) / 100;
}

export function BodyScanMassShare_toPercent(mass: number, bodyWeight: number): number {
  return (mass / bodyWeight) * 100;
}

export function BodyScanMassShare_nearestWeight(
  weights: IStatsWeightValue[] | undefined,
  timestamp: number,
  unit: IBodyScanUnit
): number | undefined {
  let nearest: IStatsWeightValue | undefined;
  for (const entry of weights ?? []) {
    const gap = Math.abs(entry.timestamp - timestamp);
    if (gap <= maxWeightGapMs && (nearest == null || gap < Math.abs(nearest.timestamp - timestamp))) {
      nearest = entry;
    }
  }
  if (nearest == null) {
    return undefined;
  }
  return BodyScans_massIn(nearest.value.value, nearest.value.unit === "lb" ? "lb" : "kg", unit);
}

export function BodyScanMassShare_bodyWeight(
  form: IBodyScanForm,
  nearestWeight: number | undefined
): number | undefined {
  return readNumber(form.weight) ?? nearestWeight;
}

export function BodyScanMassShare_modes(log: IBodyScanLog): Required<IBodyScanShareModes> {
  const modes: Required<IBodyScanShareModes> = { muscleMass: "mass", boneMass: "mass" };
  for (const key of BodyScans_shareKeys) {
    const last = log.scans.find((s) => s[key] != null);
    if (last?.percentEntered?.includes(key)) {
      modes[key] = "percent";
    }
  }
  return modes;
}

export function BodyScanMassShare_switch(
  form: IBodyScanForm,
  key: IBodyScanShareKey,
  to: IBodyScanShareMode,
  bodyWeight: number | undefined
): IBodyScanForm {
  const value = readNumber(form[key]);
  if (value == null || bodyWeight == null) {
    return form;
  }
  const converted =
    to === "percent" ? BodyScanMassShare_toPercent(value, bodyWeight) : BodyScanMassShare_toMass(value, bodyWeight);
  return { ...form, [key]: oneDecimal(converted) };
}

// A photo read always gives masses, so a field it fills goes back to mass.
export function BodyScanMassShare_afterRead(modes: IBodyScanShareModes, read: IBodyScanRead): IBodyScanShareModes {
  const next = { ...modes };
  for (const key of BodyScans_shareKeys) {
    if (read[key] != null && read.unit != null) {
      next[key] = "mass";
    }
  }
  return next;
}

export function BodyScanMassShare_fromForm(
  form: IBodyScanForm,
  modes: IBodyScanShareModes,
  unit: IBodyScanUnit,
  now: number,
  nearestWeight: number | undefined
): { kind: "ok"; scan: IBodyScan } | { kind: "error"; message: string } {
  const percentKeys = BodyScans_shareKeys.filter((k) => modes[k] === "percent" && (form[k] ?? "").trim() !== "");
  if (percentKeys.length === 0) {
    return BodyScans_fromForm(form, unit, now);
  }
  const labelOf = (key: IBodyScanShareKey): string => BodyScans_fields.find((f) => f.key === key)?.label ?? key;
  const invalid = percentKeys.filter((k) => {
    const value = readNumber(form[k]);
    return value == null || value > 100;
  });
  if (invalid.length > 0) {
    return { kind: "error", message: `Check these values: ${invalid.map(labelOf).join(", ")}` };
  }
  const formWeight = readNumber(form.weight);
  const bodyWeight = formWeight ?? nearestWeight;
  if (bodyWeight == null) {
    const labels = percentKeys.map((k) => labelOf(k).toLowerCase()).join(" and ");
    return { kind: "error", message: `Enter your weight, so ${labels} in % can be saved in ${unit}.` };
  }
  const converted: IBodyScanForm = { ...form };
  for (const key of percentKeys) {
    converted[key] = `${Math.round(BodyScanMassShare_toMass(readNumber(form[key])!, bodyWeight) * 100) / 100}`;
  }
  const result = BodyScans_fromForm(converted, unit, now);
  if (result.kind === "error") {
    return result;
  }
  const scan: IBodyScan = { ...result.scan, percentEntered: percentKeys };
  return { kind: "ok", scan: formWeight == null ? { ...scan, basisWeight: bodyWeight } : scan };
}

export function BodyScanMassShare_formatValue(field: IBodyScanField, scan: IBodyScan): string | undefined {
  const value = scan[field.key];
  if (value == null) {
    return undefined;
  }
  const mass = BodyScans_formatValue(field, value, scan.unit);
  const bodyWeight = scan.weight ?? scan.basisWeight;
  if (!BodyScanMassShare_isShareKey(field.key) || bodyWeight == null) {
    return mass;
  }
  const percent = `${oneDecimal(BodyScanMassShare_toPercent(value, bodyWeight))}%`;
  return scan.percentEntered?.includes(field.key) ? `${percent} · ${mass}` : `${mass} · ${percent}`;
}
