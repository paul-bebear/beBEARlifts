import { IHistoryRecord, ISet, IUnit } from "../types";
import { IDisplaySet, Reps_group, Reps_setToDisplaySet } from "./set";

export interface ISetClipTarget {
  workoutId: number;
  setId: string;
  exerciseId: string;
}

export interface ISetClip extends ISetClipTarget {
  timestamp: number;
  size: number;
  duration?: number;
  thumbnail?: string;
  savedVia: "share" | "download";
}

export interface ISetClipLog {
  version: 1;
  clips: ISetClip[];
}

// Each record carries a thumbnail of up to 30 KB, so 300 records can reach 9 MB. The cap stays and the screen says so.
export const SetClips_maxRecords = 300;
export const SetClips_keepNote = `beBEAR keeps the newest ${SetClips_maxRecords} filmed sets. Older clip records are removed. The videos stay in Photos or downloads.`;
export const SetClips_thumbnailWidth = 160;
export const SetClips_thumbnailMaxBytes = 30 * 1024;

export function SetClips_empty(): ISetClipLog {
  return { version: 1, clips: [] };
}

export function SetClips_workoutId(workout: Pick<IHistoryRecord, "id" | "startTime">): number {
  return workout.id === 0 ? workout.startTime : workout.id;
}

export function SetClips_thumbnail(value: unknown): string | undefined {
  return typeof value === "string" &&
    value.length <= SetClips_thumbnailMaxBytes &&
    /^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/.test(value)
    ? value
    : undefined;
}

function nonnegative(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function parseClip(raw: unknown): ISetClip | undefined {
  const r = (raw ?? {}) as Record<string, unknown>;
  if (
    !nonnegative(r.workoutId) ||
    typeof r.setId !== "string" ||
    !r.setId ||
    typeof r.exerciseId !== "string" ||
    !r.exerciseId ||
    !nonnegative(r.timestamp) ||
    !nonnegative(r.size) ||
    (r.savedVia !== "share" && r.savedVia !== "download")
  ) {
    return undefined;
  }
  return {
    workoutId: r.workoutId,
    setId: r.setId,
    exerciseId: r.exerciseId,
    timestamp: r.timestamp,
    size: r.size,
    savedVia: r.savedVia,
    duration: nonnegative(r.duration) ? r.duration : undefined,
    thumbnail: SetClips_thumbnail(r.thumbnail),
  };
}

export function SetClips_find(log: ISetClipLog, target: ISetClipTarget): ISetClip | undefined {
  return log.clips.find(
    (clip) =>
      clip.workoutId === target.workoutId && clip.setId === target.setId && clip.exerciseId === target.exerciseId
  );
}

export function SetClips_put(log: ISetClipLog, clip: ISetClip): ISetClipLog {
  const clean = parseClip(clip);
  if (clean == null) {
    return log;
  }
  const existing = SetClips_find(log, clean);
  if (existing != null && existing.timestamp > clean.timestamp) {
    return log;
  }
  const others = log.clips.filter(
    (item) => item.workoutId !== clean.workoutId || item.setId !== clean.setId || item.exerciseId !== clean.exerciseId
  );
  return {
    version: 1,
    clips: [clean, ...others].sort((a, b) => b.timestamp - a.timestamp).slice(0, SetClips_maxRecords),
  };
}

export function SetClips_parse(raw: unknown): ISetClipLog {
  const r = (raw ?? {}) as Record<string, unknown>;
  const clips = Array.isArray(r.clips) ? r.clips.map(parseClip).filter((c): c is ISetClip => c != null) : [];
  return clips.sort((a, b) => a.timestamp - b.timestamp).reduce(SetClips_put, SetClips_empty());
}

export function SetClips_groups(
  sets: ISet[],
  isNext: boolean,
  log: ISetClipLog | undefined,
  workoutId: number | undefined,
  exerciseId: string | undefined
): ISet[][] {
  return Reps_group(sets, isNext).flatMap((group) =>
    !isNext &&
    log != null &&
    workoutId != null &&
    exerciseId != null &&
    group.some((set) => SetClips_find(log, { workoutId, exerciseId, setId: set.id }) != null)
      ? group.map((set) => [set])
      : [group]
  );
}

export function SetClips_savedLabel(clip: ISetClip): string {
  const time = new Date(clip.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return `${clip.savedVia === "share" ? "Saved to Photos" : "Downloaded"} at ${time}`;
}

export function SetClips_historyGroups(
  sets: ISet[],
  isNext: boolean,
  units: IUnit,
  log?: ISetClipLog,
  workoutId?: number,
  exerciseId?: string
): { sets: IDisplaySet[]; clip?: ISetClip }[] {
  return SetClips_groups(sets, isNext, log, workoutId, exerciseId).map((group) => ({
    sets: group.map((set) => Reps_setToDisplaySet(set, isNext, units)),
    clip:
      !isNext && log != null && workoutId != null && exerciseId != null && group[0] != null
        ? SetClips_find(log, { workoutId, exerciseId, setId: group[0].id })
        : undefined,
  }));
}

export function SetClips_filmedSets(sets: ISet[], log?: ISetClipLog, workoutId?: number, exerciseId?: string): ISet[] {
  return log != null && workoutId != null && exerciseId != null
    ? sets.filter((set) => SetClips_find(log, { workoutId, exerciseId, setId: set.id }) != null)
    : [];
}
