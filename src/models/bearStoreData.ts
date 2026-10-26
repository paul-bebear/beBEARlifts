export type IBearLine = "male" | "female";
export type IBearFur = "brown" | "black" | "polar";

// line stays unset until the user picks one, so the onboarding sex answer can fill the default.
// seeded is set the first time the bear renders, after celebratedLevel is raised to the level reached.
export interface IBearStoreData {
  line?: IBearLine;
  fur?: IBearFur;
  celebratedLevel: number;
  seenBadges: string[];
  spent: number;
  seeded?: true;
  badgesSeeded?: true;
}

export function BearStoreData_empty(): IBearStoreData {
  return { celebratedLevel: 1, seenBadges: [], spent: 0 };
}

function wholeAtLeast(value: unknown, min: number): number | undefined {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= min ? value : undefined;
}

// Each field falls back on its own, so one bad value never resets the spent honey or the chosen bear.
export function BearStoreData_parse(raw: unknown): IBearStoreData {
  if (raw == null || typeof raw !== "object" || Array.isArray(raw)) {
    return BearStoreData_empty();
  }
  const r = raw as Record<string, unknown>;
  const empty = BearStoreData_empty();
  const celebratedLevel = wholeAtLeast(r.celebratedLevel, 1);
  const seenBadges = Array.isArray(r.seenBadges) ? r.seenBadges.filter((id) => typeof id === "string") : undefined;
  // A lost level or badge list drops its seeded flag too, so the next render seeds it again with no celebration.
  return {
    ...(r.line === "male" || r.line === "female" ? { line: r.line } : {}),
    ...(r.fur === "brown" || r.fur === "black" || r.fur === "polar" ? { fur: r.fur } : {}),
    celebratedLevel: celebratedLevel ?? empty.celebratedLevel,
    seenBadges: seenBadges ?? empty.seenBadges,
    spent: wholeAtLeast(r.spent, 0) ?? empty.spent,
    ...(r.seeded === true && celebratedLevel != null ? { seeded: true as const } : {}),
    ...(r.badgesSeeded === true && seenBadges != null ? { badgesSeeded: true as const } : {}),
  };
}
