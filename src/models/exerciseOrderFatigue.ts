import { IExerciseType, IHistoryEntry, IHistoryRecord, ISet, ISettings } from "../types";
import { Exercise_fullName, Exercise_get, Exercise_targetMusclesGroups, Exercise_toKey } from "./exercise";

export interface IOrderFatigueLookup {
  key: (exercise: IExerciseType) => string;
  muscles: (exercise: IExerciseType) => string[];
  name: (exercise: IExerciseType) => string;
}

export function ExerciseOrderFatigue_lookup(settings: ISettings): IOrderFatigueLookup {
  return {
    key: Exercise_toKey,
    muscles: (exercise) => Exercise_targetMusclesGroups(exercise, settings),
    name: (exercise) => Exercise_fullName(Exercise_get(exercise, settings.exercises), settings),
  };
}

interface IDoneMark {
  timestamp?: number;
  index: number;
}

function isDone(set: ISet): boolean {
  return !!set.isCompleted;
}

function firstDone(entry: IHistoryEntry, index: number): IDoneMark | undefined {
  const done = entry.sets.filter(isDone);
  if (done.length === 0) {
    return undefined;
  }
  const stamps = done.map((s) => s.timestamp).filter((t): t is number => t != null);
  return { timestamp: stamps.length > 0 ? Math.min(...stamps) : undefined, index };
}

function isEarlier(a: IDoneMark, b: IDoneMark | undefined): boolean {
  if (b == null) {
    return true;
  }
  return a.timestamp != null && b.timestamp != null ? a.timestamp < b.timestamp : a.index < b.index;
}

// The lifts for the same muscles that were done before the target entry. An entry not started yet
// comes after everything already done.
function sameMuscleBefore(entries: IHistoryEntry[], targetIndex: number, lookup: IOrderFatigueLookup): string[] {
  const target = entries[targetIndex];
  const targetMuscles = new Set(lookup.muscles(target.exercise));
  const targetMark = firstDone(target, targetIndex);
  const before: string[] = [];
  entries.forEach((entry, index) => {
    const mark = firstDone(entry, index);
    if (
      index !== targetIndex &&
      mark != null &&
      isEarlier(mark, targetMark) &&
      lookup.key(entry.exercise) !== lookup.key(target.exercise) &&
      lookup.muscles(entry.exercise).some((m) => targetMuscles.has(m))
    ) {
      before.push(lookup.name(entry.exercise));
    }
  });
  return before;
}

// For each exercise of today's workout: how many same-muscle lifts came before it the last time it was done.
export function ExerciseOrderFatigue_lastBefore(
  history: IHistoryRecord[],
  startTime: number,
  keys: Set<string>,
  lookup: IOrderFatigueLookup
): Record<string, number> {
  const latest: Record<string, { record: IHistoryRecord; index: number }> = {};
  for (const record of history) {
    if (record.startTime >= startTime) {
      continue;
    }
    record.entries.forEach((entry, index) => {
      const key = lookup.key(entry.exercise);
      const known = latest[key];
      if (keys.has(key) && entry.sets.some(isDone) && (known == null || known.record.startTime < record.startTime)) {
        latest[key] = { record, index };
      }
    });
  }
  const result: Record<string, number> = {};
  for (const [key, { record, index }] of Object.entries(latest)) {
    result[key] = sameMuscleBefore(record.entries, index, lookup).length;
  }
  return result;
}

function list(names: string[]): string {
  return names.length <= 1 ? (names[0] ?? "") : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

// The program's targets come from the last time, when the muscles may have been fresh. This note
// says why fewer reps today is fine; the targets themselves stay as the program wrote them.
export function ExerciseOrderFatigue_notes(
  entries: IHistoryEntry[],
  lastBefore: Record<string, number>,
  lookup: IOrderFatigueLookup
): Record<string, string> {
  const notes: Record<string, string> = {};
  entries.forEach((entry, index) => {
    const last = lastBefore[lookup.key(entry.exercise)];
    if (last == null || entry.sets.length === 0 || entry.sets.every(isDone)) {
      return;
    }
    const before = sameMuscleBefore(entries, index, lookup);
    if (before.length <= last) {
      return;
    }
    const lastTime =
      last === 0
        ? "Last time you did this lift fresh"
        : `Last time only ${last} ${last === 1 ? "lift" : "lifts"} for these muscles came before it`;
    notes[entry.id] = `${list(before)} came first today. ${lastTime}, so a few reps fewer is normal.`;
  });
  return notes;
}
