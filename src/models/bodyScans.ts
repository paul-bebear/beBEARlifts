import { IPercentage, IWeight } from "../types";

export type IBodyScanUnit = "kg" | "lb";

export type IBodyScanKey =
  | "weight"
  | "bodyFatPct"
  | "muscleMass"
  | "waterPct"
  | "boneMass"
  | "visceralFat"
  | "bmrKcal"
  | "metabolicAge";

export type IBodyScanValues = Partial<Record<IBodyScanKey, number>>;

export interface IBodyScan extends IBodyScanValues {
  id: number;
  timestamp: number;
  unit: IBodyScanUnit;
}

export interface IBodyScanLog {
  version: 1;
  scans: IBodyScan[];
}

type IFieldKind = "mass" | "percent" | "count";

export interface IBodyScanField {
  key: IBodyScanKey;
  label: string;
  kind: IFieldKind;
  // Whether a rise is good news, for colouring the change since the last scan.
  higherIsBetter?: boolean;
}

// The fields a Tanita-style gym scale (the kind Basic-Fit clubs use) prints.
export const BodyScans_fields: IBodyScanField[] = [
  { key: "weight", label: "Weight", kind: "mass" },
  { key: "bodyFatPct", label: "Body fat", kind: "percent", higherIsBetter: false },
  { key: "muscleMass", label: "Muscle mass", kind: "mass", higherIsBetter: true },
  { key: "waterPct", label: "Body water", kind: "percent", higherIsBetter: true },
  { key: "boneMass", label: "Bone mass", kind: "mass" },
  { key: "visceralFat", label: "Visceral fat", kind: "count", higherIsBetter: false },
  { key: "bmrKcal", label: "BMR (kcal)", kind: "count" },
  { key: "metabolicAge", label: "Metabolic age", kind: "count", higherIsBetter: false },
];

const maxScans = 500;

export function BodyScans_empty(): IBodyScanLog {
  return { version: 1, scans: [] };
}

function isValid(kind: IFieldKind, value: number): boolean {
  if (!isFinite(value) || value <= 0) {
    return false;
  }
  return kind !== "percent" || value <= 100;
}

function parseScan(raw: unknown): IBodyScan | undefined {
  const r = (raw ?? {}) as Record<string, unknown>;
  if (typeof r.id !== "number" || typeof r.timestamp !== "number") {
    return undefined;
  }
  const scan: IBodyScan = { id: r.id, timestamp: r.timestamp, unit: r.unit === "lb" ? "lb" : "kg" };
  for (const field of BodyScans_fields) {
    const value = r[field.key];
    if (typeof value === "number" && isValid(field.kind, value)) {
      scan[field.key] = value;
    }
  }
  return scan;
}

export function BodyScans_parse(raw: unknown): IBodyScanLog {
  const r = (raw ?? {}) as Record<string, unknown>;
  const scans = Array.isArray(r.scans) ? r.scans.map(parseScan).filter((s): s is IBodyScan => s != null) : [];
  return { version: 1, scans: scans.sort((a, b) => b.timestamp - a.timestamp) };
}

export type IBodyScanForm = Partial<Record<IBodyScanKey, string>>;

export type IBodyScanFormResult =
  | { kind: "ok"; values: IBodyScanValues }
  | { kind: "empty" }
  | { kind: "invalid"; labels: string[] };

export function BodyScans_readForm(form: IBodyScanForm): IBodyScanFormResult {
  const values: IBodyScanValues = {};
  const invalid: string[] = [];
  for (const field of BodyScans_fields) {
    const text = (form[field.key] ?? "").trim();
    if (text === "") {
      continue;
    }
    const value = Number(text.replace(",", "."));
    if (isValid(field.kind, value)) {
      values[field.key] = value;
    } else {
      invalid.push(field.label);
    }
  }
  if (invalid.length > 0) {
    return { kind: "invalid", labels: invalid };
  }
  return Object.keys(values).length === 0 ? { kind: "empty" } : { kind: "ok", values };
}

export function BodyScans_fromForm(
  form: IBodyScanForm,
  unit: IBodyScanUnit,
  now: number
): { kind: "ok"; scan: IBodyScan } | { kind: "error"; message: string } {
  const result = BodyScans_readForm(form);
  if (result.kind === "empty") {
    return { kind: "error", message: "Enter at least one value from your scan." };
  }
  if (result.kind === "invalid") {
    return { kind: "error", message: `Check these values: ${result.labels.join(", ")}` };
  }
  return { kind: "ok", scan: { id: now, timestamp: now, unit, ...result.values } };
}

// Weight and body fat also go into the app's own measurements, so graphs and the food targets see them.
export function BodyScans_toStats(scan: IBodyScan): { weight?: IWeight; bodyfat?: IPercentage } {
  return {
    weight: scan.weight != null ? { value: scan.weight, unit: scan.unit } : undefined,
    bodyfat: scan.bodyFatPct != null ? { value: scan.bodyFatPct, unit: "%" } : undefined,
  };
}

export function BodyScans_put(log: IBodyScanLog, scan: IBodyScan): IBodyScanLog {
  const others = log.scans.filter((s) => s.id !== scan.id);
  return { ...log, scans: [scan, ...others].sort((a, b) => b.timestamp - a.timestamp).slice(0, maxScans) };
}

export function BodyScans_remove(log: IBodyScanLog, id: number): IBodyScanLog {
  return { ...log, scans: log.scans.filter((s) => s.id !== id) };
}

const lbPerKg = 2.20462;

function massIn(value: number, from: IBodyScanUnit, to: IBodyScanUnit): number {
  if (from === to) {
    return value;
  }
  return from === "kg" ? value * lbPerKg : value / lbPerKg;
}

export type IBodyScanTrend = "better" | "worse" | "neutral";

export interface IBodyScanChange {
  delta: number;
  trend: IBodyScanTrend;
}

// The older scan may be in the other unit, so masses are converted into the newer scan's unit first.
export function BodyScans_change(
  field: IBodyScanField,
  newer: IBodyScan,
  older: IBodyScan | undefined
): IBodyScanChange | undefined {
  const a = newer[field.key];
  const raw = older?.[field.key];
  if (a == null || raw == null || older == null) {
    return undefined;
  }
  const b = field.kind === "mass" ? massIn(raw, older.unit, newer.unit) : raw;
  const delta = Math.round((a - b) * 10) / 10;
  if (delta === 0 || field.higherIsBetter == null) {
    return { delta, trend: "neutral" };
  }
  return { delta, trend: delta > 0 === field.higherIsBetter ? "better" : "worse" };
}

export function BodyScans_formatValue(field: IBodyScanField, value: number, unit: IBodyScanUnit): string {
  const rounded = Math.round(value * 10) / 10;
  if (field.kind === "percent") {
    return `${rounded}%`;
  }
  if (field.kind === "mass") {
    return `${rounded} ${unit}`;
  }
  return `${rounded}`;
}

export function BodyScans_formatDelta(field: IBodyScanField, change: IBodyScanChange, unit: IBodyScanUnit): string {
  const sign = change.delta > 0 ? "+" : "";
  const suffix = field.kind === "percent" ? " pts" : field.kind === "mass" ? ` ${unit}` : "";
  return `${sign}${change.delta}${suffix}`;
}
