import { IHistoryRecord, IScreenMuscle, ISettings, IWeight } from "../types";
import {
  History_totalEntryWeight,
  History_totalRecordSets,
  History_totalRecordWeight,
  History_workoutTime,
  IPersonalRecords,
} from "./history";
import { Exercise_get, Exercise_synergistMusclesGroups, Exercise_targetMusclesGroups } from "./exercise";
import { Weight_convertTo } from "./weight";
import { BearTier_progress, IBearLevel, IBearTierProgress, IBearTierSet } from "./bearTier";
import { BearArt_cardSprite } from "./bearArt";
import { BearLevelUpArt_image } from "./bearLevelUpArt";
import { BearText_levelUp } from "./bearText";
import { IBearCountedWorkout } from "./bearGrowth";
import { IBearLine } from "./bearStoreData";
import { BearBadges_forRecord, IBearBadgeCard } from "./bearBadges";
import { IShareAchievements } from "./shareAchievements";
import { ILiftEquivalent, LiftEquivalents_pick } from "./liftEquivalents";

export type IShareCardStyle = "rank" | "receipt" | "count" | "photo";
export type IShareCardPage = IShareCardStyle | "collage" | "levelUp";

export const WorkoutStoryCard_styles: readonly IShareCardStyle[] = ["rank", "receipt", "count", "photo"];
export const WorkoutStoryCard_pages: readonly IShareCardPage[] = [...WorkoutStoryCard_styles, "collage"];

const pageLabels: Record<IShareCardPage, string> = {
  levelUp: "Level up",
  rank: "Rank",
  receipt: "Receipt",
  count: "Count",
  photo: "Photo",
  collage: "Collage",
};

export interface IReceiptLine {
  name: string;
  detail: string;
  volume: string;
}

export interface IWorkoutReceipt {
  title: string;
  date: string;
  lines: IReceiptLine[];
  moreCount: number;
  total: string;
  prCount: number;
}

export interface IShareCardBear {
  sprite: string;
  size: IBearLevel["size"];
}

export interface IWorkoutShareData {
  levelUp?: { image: string; title: string };
  stats: IWorkoutStoryStats;
  bear: IShareCardBear;
  tier: IBearTierProgress;
  toNext: string;
  badge: IBearBadgeCard;
  receipt: IWorkoutReceipt;
  equivalent?: ILiftEquivalent;
  iconCount: number;
  muscles: Partial<Record<IScreenMuscle, number>>;
}

export interface IWorkoutShareInput {
  record: IHistoryRecord;
  settings: ISettings;
  prs: IPersonalRecords;
  achievements: IShareAchievements;
  tierSet: IBearTierSet;
  line?: IBearLine;
  workouts?: readonly IBearCountedWorkout[];
  seed: number;
}

const receiptMaxLines = 6;
const maxIcons = 24;
const kgPerLb = 0.45359237;

export interface IWorkoutStoryStats {
  weight: IWeight;
  weightKg: number;
  duration: string;
  sets: number;
}

const minuteMs = 60 * 1000;
const synergistShare = 0.5;

export function WorkoutStoryCard_duration(ms: number): string {
  const minutes = Math.max(0, Math.round(ms / minuteMs));
  const hours = Math.floor(minutes / 60);
  return hours > 0 ? `${hours}h ${minutes % 60}m` : `${minutes}m`;
}

export function WorkoutStoryCard_weightNumber(weight: IWeight): string {
  return Math.round(weight.value).toLocaleString("en-US");
}

export interface IWorkoutHeadline {
  label: string;
  value: string;
  unit: string;
}

function setsWord(sets: number): string {
  return sets === 1 ? "set" : "sets";
}

export function WorkoutStoryCard_isLoaded(stats: IWorkoutStoryStats): boolean {
  return stats.weightKg > 0;
}

export function WorkoutStoryCard_headline(stats: IWorkoutStoryStats): IWorkoutHeadline {
  return WorkoutStoryCard_isLoaded(stats)
    ? { label: "LIFTED TODAY", value: WorkoutStoryCard_weightNumber(stats.weight), unit: stats.weight.unit }
    : { label: "TRAINED TODAY", value: `${stats.sets}`, unit: setsWord(stats.sets) };
}

export function WorkoutStoryCard_setsText(sets: number): string {
  return `${sets} ${setsWord(sets)}`;
}

export function WorkoutStoryCard_summary(stats: IWorkoutStoryStats, tail: string): string {
  const weight = WorkoutStoryCard_isLoaded(stats)
    ? [`${WorkoutStoryCard_weightNumber(stats.weight)} ${stats.weight.unit}`]
    : [];
  return [...weight, stats.duration, tail].join(" · ");
}

export function WorkoutStoryCard_stats(record: IHistoryRecord, settings: ISettings): IWorkoutStoryStats {
  const weight = History_totalRecordWeight(record, settings);
  return {
    weight: { ...weight, value: Math.round(weight.value) },
    weightKg: Weight_convertTo(weight, "kg").value,
    duration: WorkoutStoryCard_duration(History_workoutTime(record)),
    sets: History_totalRecordSets(record),
  };
}

// Each finished set counts fully for its target muscles and half for synergists; the busiest muscle is 1.
export function WorkoutStoryCard_muscles(
  record: IHistoryRecord,
  settings: ISettings
): Partial<Record<IScreenMuscle, number>> {
  const points: Partial<Record<IScreenMuscle, number>> = {};
  const add = (muscle: IScreenMuscle, value: number): void => {
    points[muscle] = (points[muscle] ?? 0) + value;
  };
  for (const entry of record.entries) {
    const sets = entry.sets.filter((s) => s.isCompleted).length;
    if (sets === 0) {
      continue;
    }
    for (const muscle of Exercise_targetMusclesGroups(entry.exercise, settings)) {
      add(muscle, sets);
    }
    for (const muscle of Exercise_synergistMusclesGroups(entry.exercise, settings)) {
      add(muscle, sets * synergistShare);
    }
  }
  const max = Math.max(0, ...Object.values(points).map((v) => v ?? 0));
  if (max === 0) {
    return {};
  }
  const normalized: Partial<Record<IScreenMuscle, number>> = {};
  for (const [muscle, value] of Object.entries(points) as [IScreenMuscle, number][]) {
    normalized[muscle] = Math.round((value / max) * 100) / 100;
  }
  return normalized;
}

export function WorkoutStoryCard_pageLabel(page: IShareCardPage): string {
  return pageLabels[page];
}

export function WorkoutStoryCard_pagesFor(data: IWorkoutShareData): readonly IShareCardPage[] {
  return data.levelUp != null ? ["levelUp", ...WorkoutStoryCard_pages] : WorkoutStoryCard_pages;
}

export function WorkoutStoryCard_selectedPage(data: IWorkoutShareData, selected?: IShareCardPage): IShareCardPage {
  const pages = WorkoutStoryCard_pagesFor(data);
  return selected != null && pages.includes(selected) ? selected : pages[0];
}

export function WorkoutStoryCard_prCount(record: IHistoryRecord, prs: IPersonalRecords): number {
  return Object.values(prs[record.id] ?? {}).filter((pr) => pr?.prevMaxWeightSet != null || pr?.prevMax1RMSet != null)
    .length;
}

function setsDetail(reps: number[]): string {
  return reps.every((r) => r === reps[0]) ? `${reps.length}×${reps[0]}` : `${reps.length} sets`;
}

function entryVolume(weight: IWeight): string {
  return weight.value > 0 ? WorkoutStoryCard_weightNumber(weight) : "";
}

export function WorkoutStoryCard_receipt(
  record: IHistoryRecord,
  settings: ISettings,
  prs: IPersonalRecords
): IWorkoutReceipt {
  const entries = record.entries.filter((e) => e.sets.some((s) => (s.completedReps ?? 0) > 0));
  const lines = entries.slice(0, receiptMaxLines).map((entry) => ({
    name: Exercise_get(entry.exercise, settings.exercises).name,
    detail: setsDetail(entry.sets.filter((s) => (s.completedReps ?? 0) > 0).map((s) => s.completedReps ?? 0)),
    volume: entryVolume(History_totalEntryWeight(entry, settings)),
  }));
  const stats = WorkoutStoryCard_stats(record, settings);
  return {
    title: record.dayName,
    date: new Date(record.startTime).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }),
    lines,
    moreCount: Math.max(0, entries.length - lines.length),
    total: WorkoutStoryCard_isLoaded(stats)
      ? `${WorkoutStoryCard_weightNumber(stats.weight)} ${stats.weight.unit}`
      : WorkoutStoryCard_setsText(stats.sets),
    prCount: WorkoutStoryCard_prCount(record, prs),
  };
}

export function WorkoutStoryCard_toNext(
  tier: IBearTierProgress,
  settings: ISettings,
  lifetimeKg: number = tier.tier.minKg
): string {
  if (tier.next == null) {
    const total = settings.units === "lb" ? lifetimeKg / kgPerLb : lifetimeKg;
    return `${Math.round(total).toLocaleString("en-US")} ${settings.units} lifetime`;
  }
  const amount = settings.units === "lb" ? tier.kgToNext / kgPerLb : tier.kgToNext;
  return `${Math.ceil(amount).toLocaleString("en-US")} ${settings.units} to Level ${tier.next.level} · ${tier.next.name}`;
}

export function WorkoutStoryCard_exportImages(
  data: IWorkoutShareData,
  pages: readonly IShareCardPage[],
  photo?: string
): string[] {
  const usesPhoto = photo != null && pages.some((page) => page === "photo" || page === "collage");
  const images = pages.some((page) => page !== "levelUp") ? [data.bear.sprite] : [];
  if (pages.includes("levelUp") && data.levelUp != null) {
    images.push(data.levelUp.image);
  }
  if (usesPhoto) {
    images.push(photo);
  }
  return images;
}

export function WorkoutStoryCard_iconCount(count: number): number {
  return Math.max(1, Math.min(maxIcons, Math.round(count)));
}

function levelUpFor(input: IWorkoutShareInput): IWorkoutShareData["levelUp"] {
  let beforeKg = 0;
  if (input.workouts == null) {
    return undefined;
  }
  for (const workout of input.workouts) {
    if (workout.record.id === input.record.id) {
      const progress = BearTier_progress(beforeKg, beforeKg + workout.countedKg, input.tierSet);
      const image = BearLevelUpArt_image(input.line ?? input.tierSet, progress.tier.level);
      return progress.isTierUp && image != null
        ? { image, title: BearText_levelUp(progress.tier.level, input.tierSet).title }
        : undefined;
    }
    beforeKg += workout.countedKg;
  }
  return undefined;
}

export function WorkoutStoryCard_build(input: IWorkoutShareInput): IWorkoutShareData {
  const { record, settings, prs, achievements } = input;
  const stats = WorkoutStoryCard_stats(record, settings);
  const lifetime = achievements.lifetimeKg.get(record.id) ?? { beforeKg: 0, afterKg: stats.weightKg };
  const tier = BearTier_progress(lifetime.beforeKg, lifetime.afterKg, input.tierSet);
  const equivalent = LiftEquivalents_pick(stats.weightKg, input.seed);
  return {
    levelUp: levelUpFor(input),
    stats,
    bear: {
      sprite: BearArt_cardSprite(input.line ?? input.tierSet, tier.tier.level),
      size: tier.tier.size,
    },
    tier: { ...tier, tier: { ...tier.tier, name: `Level ${tier.tier.level} · ${tier.tier.name}` } },
    toNext: WorkoutStoryCard_toNext(tier, settings, lifetime.afterKg),
    badge: BearBadges_forRecord(achievements.badges, record),
    receipt: WorkoutStoryCard_receipt(record, settings, prs),
    equivalent,
    iconCount: WorkoutStoryCard_iconCount(equivalent?.count ?? 0),
    muscles: WorkoutStoryCard_muscles(record, settings),
  };
}
