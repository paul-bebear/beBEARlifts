import { IHistoryRecord } from "../types";
import { IPersonalRecords } from "./history";
import { FoodLog_dayKey, FoodLog_shiftDay, IFoodLog } from "./foodLog";

export type IBearBadgeId =
  | "firstPr"
  | "bearWeek"
  | "outOfHibernation"
  | "honeyHunter"
  | "earlyBear"
  | "nightBear"
  | "hundredWorkouts";

export interface IBearBadgeInfo {
  id: IBearBadgeId;
  name: string;
  description: string;
  emoji: string;
}

export type IBearBadge = { id: IBearBadgeId; recordId: number; at: number } | { id: IBearBadgeId; day: string };

export interface IBearBadgeSources {
  history: IHistoryRecord[];
  prs: IPersonalRecords;
  doneDays: Set<string>;
  foodLog: IFoodLog;
}

export interface IBearBadgeCard {
  badge?: IBearBadgeInfo;
  isNew: boolean;
  earned: number;
  total: number;
}

const infos: IBearBadgeInfo[] = [
  { id: "firstPr", name: "First PR", description: "Beat a previous best", emoji: "🏆" },
  { id: "bearWeek", name: "Bear week", description: "Logged 7 days in a row", emoji: "🔥" },
  { id: "outOfHibernation", name: "Out of hibernation", description: "Back after 14+ days off", emoji: "🌱" },
  { id: "honeyHunter", name: "Honey hunter", description: "Protein goal 7 days in a row", emoji: "🍯" },
  { id: "earlyBear", name: "Early bear", description: "Started before 7am", emoji: "🌅" },
  { id: "nightBear", name: "Night bear", description: "Started after 10pm", emoji: "🌙" },
  { id: "hundredWorkouts", name: "100 workouts", description: "Finished 100 workouts", emoji: "💯" },
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

function seventhDayOfFirstRun(days: Set<string>): string | undefined {
  for (const day of Array.from(days).sort()) {
    let length = 1;
    let cursor = day;
    while (length < runDays && days.has(FoodLog_shiftDay(cursor, 1))) {
      cursor = FoodLog_shiftDay(cursor, 1);
      length += 1;
    }
    if (length === runDays) {
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
  const bearWeekDay = seventhDayOfFirstRun(sources.doneDays);
  if (bearWeekDay != null) {
    earned.set("bearWeek", { id: "bearWeek", day: bearWeekDay });
  }
  const honeyDay = seventhDayOfFirstRun(proteinDays(sources.foodLog));
  if (honeyDay != null) {
    earned.set("honeyHunter", { id: "honeyHunter", day: honeyDay });
  }
  return Array.from(earned.values()).sort((a, b) => sortKey(a) - sortKey(b));
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
