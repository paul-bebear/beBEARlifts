export interface IRunPoint {
  t: number;
  lat: number;
  lon: number;
  acc: number;
  alt?: number;
}

export interface IRunSegment {
  startedAt: number;
  endedAt?: number;
  points: IRunPoint[];
}

export interface IRunSplit {
  km: number;
  ms: number;
}

export interface IRunStats {
  distanceM: number;
  movingMs: number;
  paceSecPerKm?: number;
  splits: IRunSplit[];
  fastestKm?: IRunSplit;
  elevationGainM: number;
}

export type IRunPointVerdict = "keep" | "inaccurate" | "jump" | "still" | "stale";

export const RunTrack_maxAccuracyM = 25;
const RunTrack_maxSpeedKmh = 25;
// GPS wanders a few metres while you stand still; counting every wobble adds distance you never ran.
const RunTrack_minStepM = 5;
// Phone altitude is noisy by several metres, so smaller changes are not climbs.
const RunTrack_minClimbM = 3;
const RunTrack_minPaceDistanceM = 50;
const RunTrack_recentPaceWindowMs = 30 * 1000;

const earthRadiusM = 6371000;
const altitudeWindow = 5;

function radians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

export function RunTrack_distanceM(a: Pick<IRunPoint, "lat" | "lon">, b: Pick<IRunPoint, "lat" | "lon">): number {
  const dLat = radians(b.lat - a.lat);
  const dLon = radians(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(radians(a.lat)) * Math.cos(radians(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * earthRadiusM * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function RunTrack_judge(previous: IRunPoint | undefined, point: IRunPoint): IRunPointVerdict {
  if (
    !Number.isFinite(point.t) ||
    !Number.isFinite(point.lat) ||
    !Number.isFinite(point.lon) ||
    Math.abs(point.lat) > 90 ||
    Math.abs(point.lon) > 180 ||
    !(point.acc >= 0 && point.acc <= RunTrack_maxAccuracyM)
  ) {
    return "inaccurate";
  }
  if (previous == null) {
    return "keep";
  }
  const seconds = (point.t - previous.t) / 1000;
  if (seconds <= 0) {
    return "stale";
  }
  const metres = RunTrack_distanceM(previous, point);
  if (metres < RunTrack_minStepM) {
    return "still";
  }
  return (metres / seconds) * 3.6 > RunTrack_maxSpeedKmh ? "jump" : "keep";
}

function pathM(points: IRunPoint[]): number {
  let total = 0;
  for (let i = 1; i < points.length; i += 1) {
    total += RunTrack_distanceM(points[i - 1], points[i]);
  }
  return total;
}

function RunTrack_totalDistanceM(segments: IRunSegment[]): number {
  return segments.reduce((sum, segment) => sum + pathM(segment.points), 0);
}

function RunTrack_movingMs(segments: IRunSegment[], now: number): number {
  return segments.reduce((sum, s) => sum + Math.max(0, (s.endedAt ?? now) - s.startedAt), 0);
}

export function RunTrack_pace(distanceM: number, movingMs: number): number | undefined {
  if (distanceM < RunTrack_minPaceDistanceM || movingMs <= 0) {
    return undefined;
  }
  return movingMs / 1000 / (distanceM / 1000);
}

// The time of a km boundary is interpolated between the two points that straddle it.
function RunTrack_splits(segments: IRunSegment[]): IRunSplit[] {
  const splits: IRunSplit[] = [];
  let distance = 0;
  let movingBefore = 0;
  let lastSplitAt = 0;
  for (const segment of segments) {
    const at = (p: IRunPoint): number => movingBefore + Math.max(0, p.t - segment.startedAt);
    for (let i = 1; i < segment.points.length; i += 1) {
      const a = segment.points[i - 1];
      const b = segment.points[i];
      const step = RunTrack_distanceM(a, b);
      while (distance + step >= (splits.length + 1) * 1000) {
        const fraction = ((splits.length + 1) * 1000 - distance) / step;
        const crossedAt = at(a) + (at(b) - at(a)) * fraction;
        splits.push({ km: splits.length + 1, ms: Math.round(crossedAt - lastSplitAt) });
        lastSplitAt = crossedAt;
      }
      distance += step;
    }
    const last = segment.points[segment.points.length - 1];
    movingBefore += Math.max(0, (segment.endedAt ?? last?.t ?? segment.startedAt) - segment.startedAt);
  }
  return splits;
}

export function RunTrack_fastest(splits: IRunSplit[]): IRunSplit | undefined {
  return splits.reduce<IRunSplit | undefined>((best, s) => (best == null || s.ms < best.ms ? s : best), undefined);
}

function smooth(values: number[]): number[] {
  const half = Math.floor(altitudeWindow / 2);
  return values.map((_, i) => {
    const window = values.slice(Math.max(0, i - half), i + half + 1);
    return window.reduce((sum, v) => sum + v, 0) / window.length;
  });
}

export function RunTrack_elevationGainM(heights: number[]): number {
  const smoothed = smooth(heights);
  let gain = 0;
  let reference = smoothed[0];
  for (const altitude of smoothed.slice(1)) {
    if (altitude - reference >= RunTrack_minClimbM) {
      gain += altitude - reference;
      reference = altitude;
    } else if (reference - altitude >= RunTrack_minClimbM) {
      reference = altitude;
    }
  }
  return Math.round(gain);
}

function altitudes(segments: IRunSegment[]): number[] {
  const result: number[] = [];
  for (const segment of segments) {
    for (const p of segment.points) {
      if (p.alt != null && Number.isFinite(p.alt)) {
        result.push(p.alt);
      }
    }
  }
  return result;
}

export function RunTrack_stats(segments: IRunSegment[], now: number): IRunStats {
  const distanceM = RunTrack_totalDistanceM(segments);
  const movingMs = RunTrack_movingMs(segments, now);
  const splits = RunTrack_splits(segments);
  return {
    distanceM,
    movingMs,
    paceSecPerKm: RunTrack_pace(distanceM, movingMs),
    splits,
    fastestKm: RunTrack_fastest(splits),
    elevationGainM: RunTrack_elevationGainM(altitudes(segments)),
  };
}

export function RunTrack_recentPace(segment: IRunSegment | undefined): number | undefined {
  const points = segment?.points ?? [];
  const last = points[points.length - 1];
  if (last == null) {
    return undefined;
  }
  const recent = points.filter((p) => p.t >= last.t - RunTrack_recentPaceWindowMs);
  const distanceM = pathM(recent);
  const ms = last.t - recent[0].t;
  return distanceM >= RunTrack_minStepM * 2 && ms > 0 ? ms / distanceM : undefined;
}

function pad(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

export function RunTrack_formatPaceNumber(secPerKm: number | undefined): string {
  if (secPerKm == null || !Number.isFinite(secPerKm)) {
    return "–:––";
  }
  const total = Math.round(secPerKm);
  return `${Math.floor(total / 60)}:${pad(total % 60)}`;
}

export function RunTrack_formatPace(secPerKm: number | undefined): string {
  return `${RunTrack_formatPaceNumber(secPerKm)} /km`;
}

export function RunTrack_formatDuration(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${minutes}:${pad(seconds)}`;
}

export function RunTrack_formatKm(distanceM: number): string {
  return (Math.floor(distanceM / 10) / 100).toFixed(2);
}
