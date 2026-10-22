export type IBearLine = "male" | "female";

export interface IBearStoreData {
  line: IBearLine;
  celebratedLevel: number;
  seenBadges: string[];
}

export function BearStoreData_empty(): IBearStoreData {
  return { line: "male", celebratedLevel: 1, seenBadges: [] };
}

export function BearStoreData_parse(raw: unknown): IBearStoreData {
  if (raw == null || typeof raw !== "object" || Array.isArray(raw)) {
    return BearStoreData_empty();
  }
  const r = raw as Record<string, unknown>;
  if (
    (r.line !== "male" && r.line !== "female") ||
    typeof r.celebratedLevel !== "number" ||
    !Number.isSafeInteger(r.celebratedLevel) ||
    r.celebratedLevel < 1 ||
    !Array.isArray(r.seenBadges) ||
    !r.seenBadges.every((id) => typeof id === "string")
  ) {
    return BearStoreData_empty();
  }
  return { line: r.line, celebratedLevel: r.celebratedLevel, seenBadges: [...r.seenBadges] };
}
