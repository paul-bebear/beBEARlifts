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

export function BearStoreData_parse(raw: unknown): IBearStoreData {
  if (raw == null || typeof raw !== "object" || Array.isArray(raw)) {
    return BearStoreData_empty();
  }
  const r = raw as Record<string, unknown>;
  if (
    (r.line != null && r.line !== "male" && r.line !== "female") ||
    (r.fur != null && r.fur !== "brown" && r.fur !== "black" && r.fur !== "polar") ||
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
    ...(r.fur === "brown" || r.fur === "black" || r.fur === "polar" ? { fur: r.fur } : {}),
    celebratedLevel: r.celebratedLevel,
    seenBadges: [...r.seenBadges],
    spent: typeof r.spent === "number" && Number.isSafeInteger(r.spent) && r.spent > 0 ? r.spent : 0,
    ...(r.seeded === true ? { seeded: true as const } : {}),
    ...(r.badgesSeeded === true ? { badgesSeeded: true as const } : {}),
  };
}
