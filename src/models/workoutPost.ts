import { IHistoryRecord, ISettings, ISet, IUnit, IWeight } from "../types";
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

export interface IWorkoutPostSummary {
  version: 1;
  programName?: string;
  dayName: string;
  startedAt: number;
  durationMs: number;
  volume: IWeight;
  sets: number;
  topSets: IPostSet[];
  prs: IPostSet[];
  keptSongs?: number;
}

const maxExercises = 20;
const maxText = 80;

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

export function WorkoutPost_build(
  record: IHistoryRecord,
  settings: ISettings,
  prs: IPersonalRecords,
  keptSongs: number | undefined
): IWorkoutPostSummary {
  const topSets: IPostSet[] = [];
  for (const entry of History_getStartedEntries(record).slice(0, maxExercises)) {
    const set = History_getMaxWeightSetFromEntry(entry);
    if (set != null) {
      topSets.push(setOf(Exercise_get(entry.exercise, settings.exercises).name, set, settings.units));
    }
  }
  return {
    version: 1,
    programName: record.programName || undefined,
    dayName: record.dayName,
    startedAt: record.startTime,
    durationMs: History_workoutTime(record),
    volume: History_totalRecordWeight(record, settings),
    sets: History_totalRecordSets(record),
    topSets,
    prs: prsOf(record, prs, settings),
    keptSongs: keptSongs != null && keptSongs > 0 ? keptSongs : undefined,
  };
}

export function WorkoutPost_statsLine(summary: IWorkoutPostSummary): string {
  const minutes = Math.round(summary.durationMs / 60000);
  const duration = minutes >= 60 ? `${Math.floor(minutes / 60)} h ${minutes % 60} min` : `${minutes} min`;
  const volume = `${Math.round(summary.volume.value).toLocaleString("en-US")} ${summary.volume.unit}`;
  return [
    duration,
    ...(summary.volume.value > 0 ? [volume] : []),
    `${summary.sets} ${summary.sets === 1 ? "set" : "sets"}`,
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
  return {
    version: 1,
    programName: text(r.programName),
    dayName,
    startedAt,
    durationMs: num(r.durationMs) ?? 0,
    volume,
    sets: num(r.sets) ?? 0,
    topSets: postSets(r.topSets),
    prs: postSets(r.prs),
    keptSongs: num(r.keptSongs),
  };
}
