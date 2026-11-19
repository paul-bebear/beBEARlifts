export function UnknownValue_isRecord(value: unknown): value is Record<string, unknown> {
  return value != null && typeof value === "object";
}

export function UnknownValue_isFinite(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export function UnknownValue_isNonNegative(value: unknown): value is number {
  return UnknownValue_isFinite(value) && value >= 0;
}

export function UnknownValue_finite(value: unknown): number | undefined {
  return UnknownValue_isFinite(value) ? value : undefined;
}

export function UnknownValue_nonNegative(value: unknown): number | undefined {
  return UnknownValue_isNonNegative(value) ? value : undefined;
}

export function UnknownValue_text(value: unknown): string | undefined {
  return typeof value === "string" && value !== "" ? value : undefined;
}

export function UnknownValue_trimmedText(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() !== "" ? value.trim() : undefined;
}

export function UnknownValue_textOrEmpty(value: unknown): string {
  return typeof value === "string" ? value : "";
}
