export type IBearLine = "male" | "female";

// line stays unset until the user picks one, so the onboarding sex answer can fill the default.
// seeded is set the first time the bear renders, after celebratedLevel is raised to the level reached.
export interface IBearStoreData {
  line?: IBearLine;
  celebratedLevel: number;
  seenBadges: string[];
  seeded?: true;
  badgesSeeded?: true;
}

export function BearStoreData_empty(): IBearStoreData {
  return { celebratedLevel: 1, seenBadges: [] };
}

export function BearStoreData_parse(raw: unknown): IBearStoreData {
  if (raw == null || typeof raw !== "object" || Array.isArray(raw)) {
    return BearStoreData_empty();
  }
  const r = raw as Record<string, unknown>;
  if (
    (r.line != null && r.line !== "male" && r.line !== "female") ||
    typeof r.celebratedLevel !== "number" ||
    !Number.isSafeInteger(r.celebratedLevel) ||
    r.celebratedLevel < 1 ||
    !Array.isArray(r.seenBadges) ||
    !r.seenBadges.every((id) => typeof id === "string")
  ) {
    return BearStoreData_empty();
  }
  return {
    ...(r.line === "male" || r.line === "female" ? { line: r.line } : {}),
    celebratedLevel: r.celebratedLevel,
    seenBadges: [...r.seenBadges],
    ...(r.seeded === true ? { seeded: true as const } : {}),
    ...(r.badgesSeeded === true ? { badgesSeeded: true as const } : {}),
  };
}
