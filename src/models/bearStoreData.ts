export type IBearLine = "male" | "female";

export interface IBearSharedPost {
  id: string;
  day: string;
}

// line stays unset until the user picks one, so the onboarding sex answer can fill the default.
// seeded is set the first time the bear renders, after celebratedLevel is raised to the level reached.
export interface IBearStoreData {
  line?: IBearLine;
  celebratedLevel: number;
  seenBadges: string[];
  spent: number;
  owned: string[];
  equipped?: string;
  sharedPosts?: IBearSharedPost[];
  seeded?: true;
  badgesSeeded?: true;
}

export function BearStoreData_empty(): IBearStoreData {
  return { celebratedLevel: 1, seenBadges: [], spent: 0, owned: [] };
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
  const owned = Array.isArray(r.owned)
    ? [...new Set(r.owned.filter((id): id is string => typeof id === "string" && id.length > 0))]
    : [];
  const equipped = typeof r.equipped === "string" && owned.includes(r.equipped) ? r.equipped : undefined;
  const sharedPosts = Array.isArray(r.sharedPosts)
    ? r.sharedPosts.filter(
        (post): post is IBearSharedPost =>
          post != null &&
          typeof post === "object" &&
          typeof post.id === "string" &&
          post.id.length > 0 &&
          typeof post.day === "string" &&
          /^\d{4}-\d{2}-\d{2}$/.test(post.day) &&
          Number.isFinite(Date.parse(`${post.day}T12:00:00Z`)) &&
          new Date(`${post.day}T12:00:00Z`).toISOString().slice(0, 10) === post.day
      )
    : [];
  return {
    ...(r.line === "male" || r.line === "female" ? { line: r.line } : {}),
    celebratedLevel: r.celebratedLevel,
    seenBadges: [...r.seenBadges],
    spent: typeof r.spent === "number" && Number.isSafeInteger(r.spent) && r.spent > 0 ? r.spent : 0,
    owned,
    ...(equipped != null ? { equipped } : {}),
    ...(sharedPosts.length > 0
      ? { sharedPosts: [...new Map(sharedPosts.map((post) => [post.id, { ...post }])).values()] }
      : {}),
    ...(r.seeded === true ? { seeded: true as const } : {}),
    ...(r.badgesSeeded === true ? { badgesSeeded: true as const } : {}),
  };
}
