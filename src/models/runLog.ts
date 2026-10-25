import { IRunSplit, RunTrack_fastest, RunTrack_pace } from "./runTrack";
import { ILatLon } from "./runRoute";

export interface IRun {
  id: number;
  startedAt: number;
  endedAt: number;
  distanceM: number;
  movingMs: number;
  elevationGainM: number;
  splits: IRunSplit[];
  route: ILatLon[][];
}

export interface IRunLog {
  version: 1;
  runs: IRun[];
}

export function RunLog_empty(): IRunLog {
  return { version: 1, runs: [] };
}

export function RunLog_cardDate(startedAt: number): string {
  const date = new Date(startedAt);
  const day = date.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });
  const time = date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  return `${day} · ${time}`;
}

export function RunLog_date(startedAt: number): string {
  return new Date(startedAt).toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function nonnegative(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function parseSplit(raw: unknown): IRunSplit | undefined {
  const r = (raw ?? {}) as Record<string, unknown>;
  return nonnegative(r.km) && nonnegative(r.ms) ? { km: r.km, ms: r.ms } : undefined;
}

function parseLatLon(raw: unknown): ILatLon | undefined {
  if (!Array.isArray(raw) || raw.length !== 2) {
    return undefined;
  }
  const [lat, lon] = raw;
  return typeof lat === "number" && typeof lon === "number" && Math.abs(lat) <= 90 && Math.abs(lon) <= 180
    ? [lat, lon]
    : undefined;
}

function compact<T>(values: (T | undefined)[]): T[] {
  return values.filter((v): v is T => v != null);
}

function parseRun(raw: unknown): IRun | undefined {
  const r = (raw ?? {}) as Record<string, unknown>;
  if (
    !nonnegative(r.id) ||
    !nonnegative(r.startedAt) ||
    !nonnegative(r.endedAt) ||
    !nonnegative(r.distanceM) ||
    !nonnegative(r.movingMs)
  ) {
    return undefined;
  }
  const splits = Array.isArray(r.splits) ? compact(r.splits.map(parseSplit)) : [];
  const route = Array.isArray(r.route)
    ? r.route.map((line) => (Array.isArray(line) ? compact(line.map(parseLatLon)) : [])).filter((l) => l.length > 0)
    : [];
  return {
    id: r.id,
    startedAt: r.startedAt,
    endedAt: r.endedAt,
    distanceM: r.distanceM,
    movingMs: r.movingMs,
    elevationGainM: nonnegative(r.elevationGainM) ? r.elevationGainM : 0,
    splits,
    route,
  };
}

export function RunLog_parse(raw: unknown): IRunLog {
  const r = (raw ?? {}) as Record<string, unknown>;
  const runs = Array.isArray(r.runs) ? compact(r.runs.map(parseRun)) : [];
  return { version: 1, runs: runs.sort((a, b) => b.startedAt - a.startedAt) };
}

export function RunLog_put(log: IRunLog, run: IRun): IRunLog {
  const runs = [run, ...log.runs.filter((r) => r.id !== run.id)];
  return { ...log, runs: runs.sort((a, b) => b.startedAt - a.startedAt) };
}

export function RunLog_remove(log: IRunLog, id: number): IRunLog {
  return { ...log, runs: log.runs.filter((r) => r.id !== id) };
}

export function RunLog_pace(run: IRun): number | undefined {
  return RunTrack_pace(run.distanceM, run.movingMs);
}

export function RunLog_fastestSplit(run: IRun): IRunSplit | undefined {
  return RunTrack_fastest(run.splits);
}

// The fastest km gets the full bar; a km twice as slow gets half.
export function RunLog_splitBars(splits: IRunSplit[]): number[] {
  const fastest = RunTrack_fastest(splits);
  return splits.map((s) => (fastest == null || s.ms <= 0 ? 1 : fastest.ms / s.ms));
}
