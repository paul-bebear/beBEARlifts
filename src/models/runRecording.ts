import {
  IRunPoint,
  IRunSegment,
  IRunStats,
  RunTrack_judge,
  RunTrack_maxAccuracyM,
  RunTrack_recentPace,
  RunTrack_stats,
} from "./runTrack";
import { ILatLon, RunRoute_simplify } from "./runRoute";
import { IRun } from "./runLog";

export type IRunRecordingStatus = "recording" | "paused";

export type IRunSensorPlatform = "web" | "ios" | "android";

export type IRunPermission = "granted" | "denied" | "approximate";

export type IRunGapRule = "pause" | "split";

export interface IRunScreenHints {
  lock: string;
  warning?: string;
}

export interface IRunRecordingStep {
  recording: IRunRecording;
  save: boolean;
}

export interface IRunFix {
  t: number;
  acc: number;
}

export interface IRunRecording {
  version: 1;
  startedAt: number;
  status: IRunRecordingStatus;
  segments: IRunSegment[];
  dropped: number;
  lastFix?: IRunFix;
  savedAt?: number;
  wasRestored?: boolean;
  pausedByScreen?: boolean;
}

const RunRecording_saveEveryMs = 10 * 1000;
const RunRecording_fixStaleMs = 15 * 1000;

const geolocationPermissionDenied = 1;
const geolocationPositionUnavailable = 2;
const preciseLocationOff = 4;

export function RunRecording_start(now: number): IRunRecording {
  return { version: 1, startedAt: now, status: "recording", segments: [{ startedAt: now, points: [] }], dropped: 0 };
}

function closeLast(segments: IRunSegment[], endedAt: number): IRunSegment[] {
  const last = segments[segments.length - 1];
  if (last == null || last.endedAt != null) {
    return segments;
  }
  return [...segments.slice(0, -1), { ...last, endedAt: Math.max(last.startedAt, endedAt) }];
}

export function RunRecording_pause(recording: IRunRecording, now: number): IRunRecording {
  if (recording.status !== "recording") {
    return recording;
  }
  return { ...recording, status: "paused", segments: closeLast(recording.segments, now) };
}

export function RunRecording_markHidden(recording: IRunRecording, now: number): IRunRecording {
  return recording.status === "recording"
    ? { ...RunRecording_pause(recording, Math.max(recording.lastFix?.t ?? now, now)), pausedByScreen: true }
    : recording;
}

function lastFixAt(recording: IRunRecording): number {
  const segment = recording.segments[recording.segments.length - 1];
  return Math.max(recording.lastFix?.t ?? 0, segment?.startedAt ?? recording.startedAt);
}

function isStale(recording: IRunRecording, now: number): boolean {
  return recording.status === "recording" && now - lastFixAt(recording) >= RunRecording_fixStaleMs;
}

export function RunRecording_pauseStale(recording: IRunRecording, now: number): IRunRecording {
  return isStale(recording, now) ? RunRecording_pause(recording, lastFixAt(recording)) : recording;
}

export function RunRecording_splitStale(recording: IRunRecording, now: number): IRunRecording {
  const segment = recording.segments[recording.segments.length - 1];
  if (segment == null || !isStale(recording, now)) {
    return recording;
  }
  const kept =
    segment.points.length === 0 ? recording.segments.slice(0, -1) : closeLast(recording.segments, lastFixAt(recording));
  return { ...recording, segments: [...kept, { startedAt: now, points: [] }] };
}

export function RunRecording_gapRule(platform: IRunSensorPlatform): IRunGapRule {
  return platform === "ios" ? "split" : "pause";
}

export function RunRecording_checkStale(recording: IRunRecording, now: number, gapRule: IRunGapRule): IRunRecording {
  return gapRule === "pause" ? RunRecording_pauseStale(recording, now) : RunRecording_splitStale(recording, now);
}

export function RunRecording_onTick(recording: IRunRecording, now: number, gapRule: IRunGapRule): IRunRecordingStep {
  const next = RunRecording_checkStale(recording, now, gapRule);
  return { recording: next, save: next !== recording || RunRecording_isSaveDue(next.savedAt, now) };
}

export function RunRecording_onFix(
  recording: IRunRecording,
  point: IRunPoint,
  gapRule: IRunGapRule,
  now: number
): IRunRecordingStep {
  const next = RunRecording_addPoint(recording, point, gapRule);
  const reshaped = next.status !== recording.status || next.segments.length !== recording.segments.length;
  return { recording: next, save: reshaped || RunRecording_isSaveDue(next.savedAt, now) };
}

export function RunRecording_clearsGpsError(point: IRunPoint): boolean {
  return point.acc <= RunTrack_maxAccuracyM;
}

// With "split", time between the last fix and now may be a gap the next fix removes, so the clock stops at the last fix.
export function RunRecording_stats(recording: IRunRecording, now: number, gapRule: IRunGapRule): IRunStats {
  const until = gapRule === "split" ? Math.min(now, lastFixAt(recording)) : now;
  return RunTrack_stats(recording.segments, until);
}

export function RunRecording_resume(recording: IRunRecording, now: number): IRunRecording {
  if (recording.status !== "paused") {
    return recording;
  }
  return {
    ...recording,
    status: "recording",
    wasRestored: false,
    pausedByScreen: false,
    segments: [...recording.segments, { startedAt: now, points: [] }],
  };
}

export function RunRecording_addPoint(
  recording: IRunRecording,
  point: IRunPoint,
  gapRule: IRunGapRule = "pause"
): IRunRecording {
  const previous = recording.segments[recording.segments.length - 1];
  if (point.t < (previous?.startedAt ?? 0) || point.t < (recording.lastFix?.t ?? 0)) {
    return recording;
  }
  const checked =
    gapRule === "split" ? RunRecording_splitStale(recording, point.t) : RunRecording_pauseStale(recording, point.t);
  const segment = checked.segments[checked.segments.length - 1];
  const withFix = { ...checked, lastFix: { t: point.t, acc: point.acc } };
  if (checked.status !== "recording" || segment == null) {
    return withFix;
  }
  const verdict = RunTrack_judge(segment.points[segment.points.length - 1], point);
  if (verdict === "inaccurate" || verdict === "jump") {
    return { ...withFix, dropped: recording.dropped + 1 };
  }
  if (verdict !== "keep") {
    return withFix;
  }
  const startedAt = gapRule === "split" && segment.points.length === 0 ? point.t : segment.startedAt;
  const segments = [...checked.segments.slice(0, -1), { ...segment, startedAt, points: [...segment.points, point] }];
  return { ...withFix, segments };
}

export function RunRecording_isSaveDue(lastSavedAt: number | undefined, now: number): boolean {
  return lastSavedAt == null || now - lastSavedAt >= RunRecording_saveEveryMs;
}

export function RunRecording_snapshot(recording: IRunRecording, now: number): IRunRecording {
  return { ...recording, savedAt: now };
}

// After a reload the gap since the last save is unknown, so the run comes back paused at the last moment it was saved.
export function RunRecording_restore(saved: IRunRecording): IRunRecording {
  if (saved.status !== "recording") {
    return { ...saved, wasRestored: true };
  }
  const last = saved.segments[saved.segments.length - 1];
  const lastPointAt = last?.points[last.points.length - 1]?.t ?? 0;
  const endedAt = Math.max(saved.savedAt ?? 0, lastPointAt);
  return { ...saved, status: "paused", wasRestored: true, segments: closeLast(saved.segments, endedAt) };
}

export function RunRecording_hasFreshFix(recording: IRunRecording, now: number): boolean {
  return recording.lastFix != null && now - recording.lastFix.t < RunRecording_fixStaleMs;
}

export function RunRecording_fixText(recording: IRunRecording, now: number, platform: IRunSensorPlatform): string {
  if (recording.status === "paused") {
    return "GPS paused";
  }
  if (!RunRecording_hasFreshFix(recording, now)) {
    return platform === "ios" ? "Waiting for GPS. Stay outside." : "Waiting for GPS. Keep the app open outside.";
  }
  const accuracy = Math.round(recording.lastFix!.acc);
  return accuracy > RunTrack_maxAccuracyM
    ? `GPS ±${accuracy} m. Waiting for accuracy within 25 m.`
    : `GPS ±${accuracy} m`;
}

export function RunRecording_recentPace(recording: IRunRecording, now: number): number | undefined {
  const segment = recording.segments[recording.segments.length - 1];
  const last = segment?.points[segment.points.length - 1];
  return recording.status === "recording" &&
    RunRecording_hasFreshFix(recording, now) &&
    last != null &&
    now - last.t < RunRecording_fixStaleMs
    ? RunTrack_recentPace(segment)
    : undefined;
}

export function RunRecording_pointCount(recording: IRunRecording): number {
  return recording.segments.reduce((sum, s) => sum + s.points.length, 0);
}

export function RunRecording_toRun(recording: IRunRecording, now: number): IRun | undefined {
  if (RunRecording_pointCount(recording) < 2) {
    return undefined;
  }
  const segments = RunRecording_pause(RunRecording_pauseStale(recording, now), now).segments;
  const stats = RunTrack_stats(segments, now);
  const route = RunRoute_simplify(segments.map((s) => s.points.map((p): ILatLon => [p.lat, p.lon])));
  return {
    id: recording.startedAt,
    startedAt: recording.startedAt,
    endedAt: now,
    distanceM: Math.round(stats.distanceM),
    movingMs: stats.movingMs,
    elevationGainM: stats.elevationGainM,
    splits: stats.splits,
    route,
  };
}

export function RunRecording_gpsErrorText(code: number, platform: IRunSensorPlatform): string {
  if (code === geolocationPermissionDenied) {
    return platform === "ios"
      ? "Location is off for beBEAR. Turn it on in Settings, beBEAR, Location, While Using the App."
      : "Location is blocked. Turn it on in Settings, Privacy & Security, Location Services, Safari Websites, then reopen the app.";
  }
  if (code === geolocationPositionUnavailable) {
    return "No GPS signal yet. Step outside, away from tall buildings.";
  }
  if (code === preciseLocationOff) {
    return "Precise Location is off, so distance would be wrong. Turn it on in Settings, beBEAR, Location, Precise Location.";
  }
  return platform === "ios"
    ? "GPS is slow to answer. It keeps trying."
    : "GPS is slow to answer. Keep the app open; it keeps trying.";
}

export function RunRecording_permissionText(
  permission: IRunPermission,
  platform: IRunSensorPlatform
): string | undefined {
  if (permission === "granted") {
    return undefined;
  }
  return RunRecording_gpsErrorText(
    permission === "approximate" ? preciseLocationOff : geolocationPermissionDenied,
    platform
  );
}

export function RunRecording_screenHints(platform: IRunSensorPlatform, screenAwake: boolean): IRunScreenHints {
  if (platform === "ios") {
    return { lock: "You can lock the phone. GPS keeps recording." };
  }
  return {
    lock: "Keep the screen on. Locking the phone stops GPS.",
    ...(screenAwake ? {} : { warning: "Screen wake lock is unavailable. Keep the display awake manually." }),
  };
}

function finite(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function parsePoint(raw: unknown): IRunPoint | undefined {
  const r = (raw ?? {}) as Record<string, unknown>;
  if (
    !finite(r.t) ||
    !finite(r.lat) ||
    !finite(r.lon) ||
    !finite(r.acc) ||
    Math.abs(r.lat) > 90 ||
    Math.abs(r.lon) > 180 ||
    r.acc < 0
  ) {
    return undefined;
  }
  return { t: r.t, lat: r.lat, lon: r.lon, acc: r.acc, ...(finite(r.alt) ? { alt: r.alt } : {}) };
}

function parseSegment(raw: unknown): IRunSegment | undefined {
  const r = (raw ?? {}) as Record<string, unknown>;
  if (!finite(r.startedAt)) {
    return undefined;
  }
  const points = Array.isArray(r.points) ? r.points.map(parsePoint).filter((p): p is IRunPoint => p != null) : [];
  return { startedAt: r.startedAt, ...(finite(r.endedAt) ? { endedAt: r.endedAt } : {}), points };
}

export function RunRecording_parse(raw: unknown): IRunRecording | undefined {
  const r = (raw ?? {}) as Record<string, unknown>;
  if (!finite(r.startedAt) || (r.status !== "recording" && r.status !== "paused") || !Array.isArray(r.segments)) {
    return undefined;
  }
  const segments = r.segments.map(parseSegment).filter((s): s is IRunSegment => s != null);
  if (segments.length === 0) {
    return undefined;
  }
  return {
    version: 1,
    startedAt: r.startedAt,
    status: r.status,
    segments,
    dropped: finite(r.dropped) ? r.dropped : 0,
    ...(finite(r.savedAt) ? { savedAt: r.savedAt } : {}),
    ...(r.pausedByScreen === true ? { pausedByScreen: true } : {}),
  };
}
