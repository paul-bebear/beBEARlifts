import { IHistoryRecord } from "../types";
import { IPersonalRecords } from "./history";
import { FoodLog_dayKey, FoodLog_shiftDay, IFoodLog } from "./foodLog";
import { IBearCountedWorkout } from "./bearGrowth";
import { BearTier_all, IBearTierSet } from "./bearTier";

export type IBearBadgeId =
  | "firstPr"
  | "bearWeek"
  | "outOfHibernation"
  | "honeyHunter"
  | "earlyBear"
  | "nightBear"
  | "hundredWorkouts"
  | "streak3"
  | "streak7"
  | "streak14"
  | "streak30"
  | "streak100"
  | `level${number}`;

export interface IBearBadgeInfo {
  id: IBearBadgeId;
  name: string;
  description: string;
  emoji: string;
  image?: string;
}

export type IBearBadge = { id: IBearBadgeId; recordId: number; at: number } | { id: IBearBadgeId; day: string };

export interface IBearBadgeSources {
  history: IHistoryRecord[];
  prs: IPersonalRecords;
  doneDays: Set<string>;
  foodLog: IFoodLog;
  workouts?: readonly IBearCountedWorkout[];
  tierSet: IBearTierSet;
  celebratedLevel: number;
}

export interface IBearBadgeEntry {
  info: IBearBadgeInfo;
  badge?: IBearBadge;
}

export interface IBearBadgeGrid {
  entries: IBearBadgeEntry[];
  earned: number;
  total: number;
}

export interface IBearBadgeCard {
  badge?: IBearBadgeInfo;
  isNew: boolean;
  earned: number;
  total: number;
}

const streakBadges: { id: IBearBadgeId; days: number; emoji: string }[] = [
  { id: "streak3", days: 3, emoji: "✨" },
  { id: "streak7", days: 7, emoji: "⭐" },
  { id: "streak14", days: 14, emoji: "🌟" },
  { id: "streak30", days: 30, emoji: "💎" },
  { id: "streak100", days: 100, emoji: "👑" },
];

const levelEmoji: Record<string, string> = {
  teen: "🧢",
  amateur: "💪",
  rookie: "🏋️",
  regular: "⚙️",
  strong: "🦾",
  athlete: "🏅",
  power: "⚡",
  titan: "🗿",
  astronaut: "🚀",
  lunar: "🌕",
  mars: "🔴",
};

function levelBadges(set: IBearTierSet): { id: IBearBadgeId; minKg: number }[] {
  return BearTier_all(set)
    .filter((tier) => tier.level > 1)
    .map((tier) => ({ id: levelId(tier.level), minKg: tier.minKg }));
}

function levelId(level: number): IBearBadgeId {
  return `level${level}`;
}

const infos: IBearBadgeInfo[] = [
  { id: "firstPr", name: "First PR", description: "Beat a previous best", emoji: "🏆" },
  { id: "bearWeek", name: "Bear week", description: "Logged 7 days in a row", emoji: "🔥" },
  { id: "outOfHibernation", name: "Out of hibernation", description: "Back after 14+ days off", emoji: "🌱" },
  { id: "honeyHunter", name: "Honey hunter", description: "Protein goal 7 days in a row", emoji: "🍯" },
  { id: "earlyBear", name: "Early bear", description: "Started before 7am", emoji: "🌅" },
  { id: "nightBear", name: "Night bear", description: "Started after 10pm", emoji: "🌙" },
  { id: "hundredWorkouts", name: "100 workouts", description: "Finished 100 workouts", emoji: "💯" },
  ...streakBadges.map(
    (b): IBearBadgeInfo => ({
      id: b.id,
      name: `${b.days}-day streak`,
      description: `Trained or logged food ${b.days} days in a row`,
      emoji: b.emoji,
    })
  ),
  ...BearTier_all("male")
    .filter((tier) => tier.level > 1)
    .map(
      (tier): IBearBadgeInfo => ({
        id: levelId(tier.level),
        name: tier.name,
        description: `Reached level ${tier.level}, ${tier.name}`,
        emoji: levelEmoji[tier.id] ?? "🐻",
      })
    ),
];

const dayMs = 24 * 60 * 60 * 1000;
const hibernationDays = 14;
const runDays = 7;
const earlyHour = 7;
const nightHour = 22;
const hundred = 100;

export function BearBadges_all(): readonly IBearBadgeInfo[] {
  return infos;
}

function recordTime(record: IHistoryRecord): number {
  return record.endTime ?? record.startTime;
}

function lastDayOfFirstRun(days: Set<string>, runLength: number): string | undefined {
  for (const day of Array.from(days).sort()) {
    let length = 1;
    let cursor = day;
    while (length < runLength && days.has(FoodLog_shiftDay(cursor, 1))) {
      cursor = FoodLog_shiftDay(cursor, 1);
      length += 1;
    }
    if (length === runLength) {
      return cursor;
    }
  }
  return undefined;
}

function proteinDays(foodLog: IFoodLog): Set<string> {
  const byDay = new Map<string, number>();
  for (const entry of foodLog.entries) {
    byDay.set(entry.day, (byDay.get(entry.day) ?? 0) + entry.nutrients.protein);
  }
  const min = foodLog.goals.protein.min;
  return new Set(
    Array.from(byDay.entries())
      .filter(([, protein]) => min > 0 && protein >= min)
      .map(([d]) => d)
  );
}

function beatPrevious(prs: IPersonalRecords, record: IHistoryRecord): boolean {
  return Object.values(prs[record.id] ?? {}).some((pr) => pr?.prevMaxWeightSet != null || pr?.prevMax1RMSet != null);
}

export function BearBadges_compute(sources: IBearBadgeSources): IBearBadge[] {
  const records = [...sources.history].sort((a, b) => recordTime(a) - recordTime(b));
  const earned = new Map<IBearBadgeId, IBearBadge>();
  const earn = (id: IBearBadgeId, record: IHistoryRecord): void => {
    if (!earned.has(id)) {
      earned.set(id, { id, recordId: record.id, at: recordTime(record) });
    }
  };
  records.forEach((record, i) => {
    const hour = new Date(record.startTime).getHours();
    const previous = records[i - 1];
    if (beatPrevious(sources.prs, record)) {
      earn("firstPr", record);
    }
    if (previous != null && record.startTime - recordTime(previous) >= hibernationDays * dayMs) {
      earn("outOfHibernation", record);
    }
    if (hour < earlyHour) {
      earn("earlyBear", record);
    }
    if (hour >= nightHour) {
      earn("nightBear", record);
    }
    if (i + 1 === hundred) {
      earn("hundredWorkouts", record);
    }
  });
  const bearWeekDay = lastDayOfFirstRun(sources.doneDays, runDays);
  if (bearWeekDay != null) {
    earned.set("bearWeek", { id: "bearWeek", day: bearWeekDay });
  }
  const honeyDay = lastDayOfFirstRun(proteinDays(sources.foodLog), runDays);
  if (honeyDay != null) {
    earned.set("honeyHunter", { id: "honeyHunter", day: honeyDay });
  }
  for (const streak of streakBadges) {
    const day = lastDayOfFirstRun(sources.doneDays, streak.days);
    if (day != null) {
      earned.set(streak.id, { id: streak.id, day });
    }
  }
  addLevelBadges(earned, sources.workouts ?? [], sources.tierSet, sources.celebratedLevel);
  return Array.from(earned.values()).sort((a, b) => sortKey(a) - sortKey(b));
}

function addLevelBadges(
  earned: Map<IBearBadgeId, IBearBadge>,
  workouts: readonly IBearCountedWorkout[],
  set: IBearTierSet,
  celebratedLevel: number
): void {
  const thresholds = levelBadges(set);
  let totalKg = 0;
  let next = 0;
  const ordered = [...workouts].sort(
    (a, b) => recordTime(a.record) - recordTime(b.record) || a.record.id - b.record.id
  );
  for (const { record, countedKg } of ordered) {
    totalKg += countedKg;
    while (next < thresholds.length && totalKg >= thresholds[next].minKg) {
      const id = thresholds[next].id;
      earned.set(id, { id, recordId: record.id, at: recordTime(record) });
      next += 1;
    }
  }
  if (ordered.length === 0) {
    return;
  }
  // A threshold that rose after a level was celebrated must not take its badge back. It keeps the date of the level below.
  let anchor = { recordId: ordered[0].record.id, at: recordTime(ordered[0].record) };
  for (let level = 2; level <= Math.min(celebratedLevel, thresholds.length + 1); level += 1) {
    const id = levelId(level);
    const existing = earned.get(id);
    if (existing != null && "recordId" in existing) {
      anchor = { recordId: existing.recordId, at: existing.at };
    } else {
      earned.set(id, { id, ...anchor });
    }
  }
}

function sortKey(badge: IBearBadge): number {
  return "day" in badge ? new Date(`${badge.day}T23:59:59`).getTime() : badge.at;
}

// "New" means this workout, or this workout's day, earned it. Nothing is stored, so it cannot mean "never shown".
export function BearBadges_forRecord(badges: IBearBadge[], record: IHistoryRecord): IBearBadgeCard {
  const day = FoodLog_dayKey(new Date(record.startTime));
  const isNewBadge = (b: IBearBadge): boolean => ("day" in b ? b.day === day : b.recordId === record.id);
  const isBefore = (b: IBearBadge): boolean => ("day" in b ? b.day < day : b.at < recordTime(record));
  const owned = badges.filter((b) => isNewBadge(b) || isBefore(b));
  const fresh = owned.filter(isNewBadge);
  const shown = fresh[fresh.length - 1] ?? owned[owned.length - 1];
  return {
    badge: shown == null ? undefined : infos.find((i) => i.id === shown.id),
    isNew: fresh.length > 0,
    earned: owned.length,
    total: infos.length,
  };
}

// Earned badges come first, newest first. Locked badges follow in the order of the list.
export function BearBadges_grid(badges: IBearBadge[]): IBearBadgeGrid {
  const byId = new Map(badges.map((b) => [b.id, b]));
  const earned = infos
    .filter((info) => byId.has(info.id))
    .map((info): IBearBadgeEntry => ({ info, badge: byId.get(info.id) }))
    .sort((a, b) => sortKey(b.badge!) - sortKey(a.badge!));
  const locked = infos.filter((info) => !byId.has(info.id)).map((info): IBearBadgeEntry => ({ info }));
  return { entries: [...earned, ...locked], earned: earned.length, total: infos.length };
}

export function BearBadges_info(id: string): IBearBadgeInfo | undefined {
  return infos.find((info) => info.id === id);
}
