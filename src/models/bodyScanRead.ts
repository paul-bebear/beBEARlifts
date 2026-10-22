import { BodyScans_fields, IBodyScanForm, IBodyScanUnit, IBodyScanValues } from "./bodyScans";
import { IFoodCapturePhoto } from "./foodCapture";

export interface IBodyScanRead extends IBodyScanValues {
  unit?: IBodyScanUnit;
}

export const BodyScanRead_unreadable = "Couldn't read that. Try a sharper photo, or type the numbers.";
export const BodyScanRead_signIn = "Sign in to use AI scans";

const lbPerKg = 2.20462;

function positive(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

export function BodyScanRead_parse(text: string): IBodyScanRead | undefined {
  let raw: unknown;
  try {
    raw = JSON.parse(text.trim().replace(/^```(?:json)?\s*([\s\S]*?)\s*```$/, "$1"));
  } catch {
    return undefined;
  }
  if (raw == null || typeof raw !== "object" || Array.isArray(raw)) {
    return undefined;
  }
  const r = raw as Record<string, unknown>;
  const unit = r.unit === "kg" || r.unit === "lb" ? r.unit : undefined;
  const scan: IBodyScanRead = {};
  for (const field of BodyScans_fields) {
    const value = r[field.key];
    if (!positive(value) || (field.kind === "percent" && value > 100) || (field.kind === "mass" && unit == null)) {
      continue;
    }
    scan[field.key] = value;
  }
  if (r.waterKg !== undefined) {
    delete scan.waterPct;
    if (positive(r.waterKg) && scan.weight != null && unit != null) {
      const weightKg = unit === "kg" ? scan.weight : scan.weight / lbPerKg;
      const percent = (r.waterKg / weightKg) * 100;
      if (percent <= 100) {
        scan.waterPct = Math.round(percent * 10) / 10;
      }
    }
  }
  if (Object.keys(scan).length === 0) {
    return undefined;
  }
  return unit == null ? scan : { ...scan, unit };
}

export function BodyScanRead_merge(form: IBodyScanForm, scan: IBodyScanRead, unit: IBodyScanUnit): IBodyScanForm {
  const next = { ...form };
  for (const field of BodyScans_fields) {
    const value = scan[field.key];
    if (value == null || (field.kind === "mass" && scan.unit == null)) {
      continue;
    }
    if (field.kind === "mass" && scan.unit !== unit) {
      const converted = unit === "lb" ? value * lbPerKg : value / lbPerKg;
      next[field.key] = `${Math.round(converted * 10) / 10}`;
    } else {
      next[field.key] = `${value}`;
    }
  }
  return next;
}

export type IBodyScanReadResult =
  | { kind: "read"; value: IBodyScanRead }
  | { kind: "cancelled" }
  | { kind: "error"; error: string };

export interface IBodyScanReadDependencies {
  authenticate: () => Promise<{ ok: true } | { ok: false; error: string }>;
  signedOutError: string;
  allow: () => Promise<boolean>;
  pick: () => Promise<IFoodCapturePhoto>;
  read: (image: string) => Promise<{ ok: true; value: IBodyScanRead } | { ok: false; error: string }>;
}

export async function BodyScanRead_permission(
  deps: Pick<IBodyScanReadDependencies, "authenticate" | "signedOutError" | "allow">
): Promise<IBodyScanReadResult | undefined> {
  const auth = await deps.authenticate();
  if (!auth.ok) {
    return { kind: "error", error: auth.error === deps.signedOutError ? BodyScanRead_signIn : auth.error };
  }
  return (await deps.allow()) ? undefined : { kind: "cancelled" };
}

export async function BodyScanRead_capture(deps: IBodyScanReadDependencies): Promise<IBodyScanReadResult> {
  try {
    const denied = await BodyScanRead_permission(deps);
    if (denied != null) {
      return denied;
    }
    const photo = await deps.pick();
    if (photo.kind !== "photo") {
      return photo;
    }
    const result = await deps.read(photo.dataUrl);
    return result.ok ? { kind: "read", value: result.value } : { kind: "error", error: result.error };
  } catch {
    return { kind: "error", error: BodyScanRead_unreadable };
  }
}
