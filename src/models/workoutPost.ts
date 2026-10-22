import { IHistoryRecord, ISettings, ISet, IUnit, IWeight } from "../types";
import { IBearMood, IBearState } from "./bear";
import { IBearLine } from "./bearStoreData";
import { BearTier_byLevel } from "./bearTier";
import { BearShop_isOutfit } from "./bearShop";
import { Exercise_get, Exercise_toKey } from "./exercise";
import {
  History_getMaxWeightSetFromEntry,
  History_getStartedEntries,
  History_totalRecordSets,
  History_totalRecordWeight,
  History_workoutTime,
  IPersonalRecords,
} from "./history";

export interface IPostSet {
  name: string;
  weight: IWeight;
  reps: number;
}

// countedKg is what this workout added to the bear, after the anti-cheat rules in bearGrowth.ts.
export interface IPostBear {
  level: number;
  mood: IBearMood;
  countedKg: number;
  line?: IBearLine;
  equipped?: string;
}

export interface IWorkoutPostSummary {
  version: 1 | 2;
  programName?: string;
  dayName: string;
  startedAt: number;
  durationMs: number;
  volume: IWeight;
  sets: number;
  topSets: IPostSet[];
  prs: IPostSet[];
  keptSongs?: number;
  bear?: IPostBear;
  songs: string[];
}

export interface IWorkoutPostExtras {
  keptSongs?: number;
  songs?: string[];
  bear?: IBearState;
  equipped?: string;
}

const maxExercises = 20;
const maxText = 80;
const maxSongs = 3;
const moods: IBearMood[] = ["pumped", "tired", "hungry", "normal"];

function setOf(name: string, set: ISet, unit: IUnit): IPostSet {
  return { name, weight: set.completedWeight ?? set.weight ?? { value: 0, unit }, reps: set.completedReps ?? 0 };
}

// The finish screen also counts a first-ever lift as a record. In a feed that is noise, so a post lists only sets that beat an earlier one.
function prsOf(record: IHistoryRecord, prs: IPersonalRecords, settings: ISettings): IPostSet[] {
  const result: IPostSet[] = [];
  for (const entry of record.entries) {
    const pr = prs[record.id]?.[Exercise_toKey(entry.exercise)];
    const set =
      pr?.maxWeightSet != null && pr.prevMaxWeightSet != null
        ? pr.maxWeightSet
        : pr?.max1RMSet != null && pr.prevMax1RMSet != null
          ? pr.max1RMSet
          : undefined;
    const name = Exercise_get(entry.exercise, settings.exercises).name;
    if (set != null && !result.some((p) => p.name === name)) {
      result.push(setOf(name, set, settings.units));
    }
  }
  return result;
}

function postBear(record: IHistoryRecord, bear: IBearState, equipped?: string): IPostBear {
  const counted = bear.workouts.find((w) => w.record.id === record.id)?.countedKg ?? 0;
  return {
    level: bear.level.tier.level,
    mood: bear.mood,
    countedKg: Math.round(counted),
    line: bear.line,
    ...(BearShop_isOutfit(equipped) ? { equipped } : {}),
  };
}

export function WorkoutPost_build(
  record: IHistoryRecord,
  settings: ISettings,
  prs: IPersonalRecords,
  extras: IWorkoutPostExtras | undefined
): IWorkoutPostSummary {
  const keptSongs = extras?.keptSongs;
  const topSets: IPostSet[] = [];
  for (const entry of History_getStartedEntries(record).slice(0, maxExercises)) {
    const set = History_getMaxWeightSetFromEntry(entry);
    if (set != null) {
      topSets.push(setOf(Exercise_get(entry.exercise, settings.exercises).name, set, settings.units));
    }
  }
  return {
    version: 2,
    programName: record.programName || undefined,
    dayName: record.dayName,
    startedAt: record.startTime,
    durationMs: History_workoutTime(record),
    volume: History_totalRecordWeight(record, settings),
    sets: History_totalRecordSets(record),
    topSets,
    prs: prsOf(record, prs, settings),
    keptSongs: keptSongs != null && keptSongs > 0 ? keptSongs : undefined,
    bear: extras?.bear != null ? postBear(record, extras.bear, extras.equipped) : undefined,
    songs: songTitles(extras?.songs),
  };
}

function durationText(durationMs: number): string {
  const minutes = Math.round(durationMs / 60000);
  return minutes >= 60 ? `${Math.floor(minutes / 60)} h ${minutes % 60} min` : `${minutes} min`;
}

function setsText(sets: number): string {
  return `${sets} ${sets === 1 ? "set" : "sets"}`;
}

export function WorkoutPost_statsLine(summary: IWorkoutPostSummary): string {
  const volume = `${Math.round(summary.volume.value).toLocaleString("en-US")} ${summary.volume.unit}`;
  return [durationText(summary.durationMs), ...(summary.volume.value > 0 ? [volume] : []), setsText(summary.sets)].join(
    " · "
  );
}

export function WorkoutPost_levelText(bear: Pick<IPostBear, "level">): string {
  const tier = BearTier_byLevel(bear.level);
  return tier != null ? `Level ${tier.level} ${tier.name}` : `Level ${bear.level}`;
}

// Duration and counted kg sit side by side, so a 3-minute "workout" with a big number reads as one.
// A version 1 post has no counted kg and shows its volume without the plus.
export function WorkoutPost_feedLine(summary: IWorkoutPostSummary): string {
  const kg =
    summary.bear != null
      ? `+${summary.bear.countedKg.toLocaleString("en-US")} kg`
      : summary.volume.value > 0
        ? `${Math.round(summary.volume.value).toLocaleString("en-US")} ${summary.volume.unit}`
        : undefined;
  const songCount = summary.songs.length > 0 ? summary.songs.length : (summary.keptSongs ?? 0);
  return [
    summary.dayName,
    durationText(summary.durationMs),
    setsText(summary.sets),
    ...(kg != null ? [kg] : []),
    ...(songCount > 0 ? [`\u{1F3B5} ${songCount} ${songCount === 1 ? "song" : "songs"}`] : []),
  ].join(" · ");
}

export function WorkoutPost_hasEarlierExercise(workoutId: number, history: IHistoryRecord[]): boolean {
  const record = history.find((h) => h.id === workoutId);
  if (record == null) {
    return false;
  }
  return history.some(
    (h) =>
      h.id !== record.id &&
      h.startTime < record.startTime &&
      h.startTime >= record.startTime - 28 * 24 * 3600 * 1000 &&
      h.entries.some(
        (past) =>
          past.sets.some((s) => s.isCompleted) &&
          record.entries.some(
            (today) =>
              today.exercise.id === past.exercise.id &&
              (today.exercise.equipment ?? "") === (past.exercise.equipment ?? "") &&
              today.sets.some((s) => s.isCompleted)
          )
      )
  );
}

export function WorkoutPost_setText(set: IPostSet): string {
  const weight = set.weight.value > 0 ? ` ${parseFloat(set.weight.value.toFixed(2))} ${set.weight.unit}` : "";
  return `${set.name}${weight} × ${set.reps}`;
}

function num(value: unknown): number | undefined {
  return typeof value === "number" && isFinite(value) ? value : undefined;
}

function text(value: unknown): string | undefined {
  return typeof value === "string" && value !== "" ? value.slice(0, maxText) : undefined;
}

function songTitles(raw: unknown): string[] {
  const result: string[] = [];
  for (const item of Array.isArray(raw) ? raw : []) {
    const title = text(item);
    if (title != null && result.length < maxSongs) {
      result.push(title);
    }
  }
  return result;
}

function parseBear(raw: unknown): IPostBear | undefined {
  const r = (raw ?? {}) as Record<string, unknown>;
  const level = num(r.level);
  const countedKg = num(r.countedKg);
  const mood = moods.find((m) => m === r.mood);
  if (level == null || countedKg == null || mood == null || BearTier_byLevel(level) == null) {
    return undefined;
  }
  const line = r.line === "male" || r.line === "female" ? r.line : undefined;
  return {
    level,
    mood,
    countedKg: Math.max(0, Math.round(countedKg)),
    ...(line != null ? { line } : {}),
    ...(BearShop_isOutfit(r.equipped) ? { equipped: r.equipped } : {}),
  };
}

function parseWeight(raw: unknown): IWeight | undefined {
  const r = (raw ?? {}) as Record<string, unknown>;
  const value = num(r.value);
  return value != null && (r.unit === "kg" || r.unit === "lb") ? { value, unit: r.unit } : undefined;
}

function postSets(raw: unknown): IPostSet[] {
  const result: IPostSet[] = [];
  for (const item of Array.isArray(raw) ? raw.slice(0, maxExercises) : []) {
    const r = (item ?? {}) as Record<string, unknown>;
    const name = text(r.name);
    const weight = parseWeight(r.weight);
    const reps = num(r.reps);
    if (name != null && weight != null && reps != null) {
      result.push({ name, weight, reps });
    }
  }
  return result;
}

// A friend's app writes the summary, so every field is checked before the feed shows it.
export function WorkoutPost_parse(raw: unknown): IWorkoutPostSummary | undefined {
  const r = (raw ?? {}) as Record<string, unknown>;
  const dayName = text(r.dayName);
  const startedAt = num(r.startedAt);
  const volume = parseWeight(r.volume);
  if (dayName == null || startedAt == null || volume == null) {
    return undefined;
  }
  const isVersion2 = r.version === 2;
  return {
    version: isVersion2 ? 2 : 1,
    programName: text(r.programName),
    dayName,
    startedAt,
    durationMs: num(r.durationMs) ?? 0,
    volume,
    sets: num(r.sets) ?? 0,
    topSets: postSets(r.topSets),
    prs: postSets(r.prs),
    keptSongs: num(r.keptSongs),
    bear: isVersion2 ? parseBear(r.bear) : undefined,
    songs: isVersion2 ? songTitles(r.songs) : [],
  };
}
