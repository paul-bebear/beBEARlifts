import { MathUtils_normalizeNumStr } from "../utils/math";

export function NumberText_parse(text: string): number | undefined {
  const trimmed = text.trim();
  if (trimmed === "") {
    return undefined;
  }
  const value = Number(MathUtils_normalizeNumStr(trimmed));
  return isFinite(value) ? value : undefined;
}

export function NumberText_parseNonNegative(text: string): number | undefined {
  const value = NumberText_parse(text);
  return value != null && value >= 0 ? value : undefined;
}

export function NumberText_parsePositive(text: string): number | undefined {
  const value = NumberText_parse(text);
  return value != null && value > 0 ? value : undefined;
}

export function NumberText_round1(value: number): number {
  return Math.round(value * 10) / 10;
}

export function NumberText_round3(value: number): number {
  return Math.round(value * 1000) / 1000;
}
