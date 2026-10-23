export type IBearLine = "male" | "female";

export interface IPendingWake {
  days: string[];
  streak: number;
}

// line stays unset until the user picks one, so the onboarding sex answer can fill the default.
// seeded is set the first time the bear renders, after celebratedLevel is raised to the level reached.
export interface IBearStoreData {
  line?: IBearLine;
  celebratedLevel: number;
  seenBadges: string[];
  spent: number;
  passes: number;
  coveredDays: string[];
  pendingWake?: IPendingWake;
  seeded?: true;
  badgesSeeded?: true;
}

export function BearStoreData_empty(): IBearStoreData {
  return { celebratedLevel: 1, seenBadges: [], spent: 0, passes: 0, coveredDays: [] };
}

function parseDays(raw: unknown): string[] {
  const days = Array.isArray(raw)
    ? raw.filter((day): day is string => typeof day === "string" && /^\d{4}-\d{2}-\d{2}$/.test(day))
    : [];
  return [...new Set(days)].sort().slice(-400);
}

function parseWake(raw: unknown): IPendingWake | undefined {
  if (raw == null || typeof raw !== "object" || Array.isArray(raw)) {
    return undefined;
  }
  const wake = raw as Record<string, unknown>;
  const days = parseDays(wake.days);
  if (
    days.length === 0 ||
    days.length > 2 ||
    typeof wake.streak !== "number" ||
    !Number.isSafeInteger(wake.streak) ||
    wake.streak < 1
  ) {
    return undefined;
  }
  return { days, streak: wake.streak };
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
  const pendingWake = parseWake(r.pendingWake);
  return {
    ...(r.line === "male" || r.line === "female" ? { line: r.line } : {}),
    celebratedLevel: r.celebratedLevel,
    seenBadges: [...r.seenBadges],
    spent: typeof r.spent === "number" && Number.isSafeInteger(r.spent) && r.spent > 0 ? r.spent : 0,
    passes: typeof r.passes === "number" && Number.isSafeInteger(r.passes) && r.passes > 0 ? Math.min(2, r.passes) : 0,
    coveredDays: parseDays(r.coveredDays),
    ...(pendingWake != null ? { pendingWake } : {}),
    ...(r.seeded === true ? { seeded: true as const } : {}),
    ...(r.badgesSeeded === true ? { badgesSeeded: true as const } : {}),
  };
}
