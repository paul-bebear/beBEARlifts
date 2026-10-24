export type ILatLon = [number, number];

export interface IXY {
  x: number;
  y: number;
}

export interface IRouteGap {
  from: IXY;
  to: IXY;
}

export interface IRouteDrawing {
  lines: string[];
  gaps: IRouteGap[];
  start?: IXY;
  end?: IXY;
}

export interface IFlatRoute {
  lats: number[];
  lons: number[];
  lengths: number[];
}

export interface IRouteMap {
  uri: string;
  drawing: IRouteDrawing;
}

export const RunRoute_hiddenEndsM = 50;

const RunRoute_pointLimit = 300;

const metresPerDegree = (6371000 * Math.PI) / 180;
const startToleranceM = 1;
const toleranceGrowth = 1.5;
const maxRounds = 40;

function origin(segments: ILatLon[][]): ILatLon | undefined {
  return segments.find((s) => s.length > 0)?.[0];
}

// An equirectangular projection keeps a few km of route within a fraction of a percent of true shape.
function project(segments: ILatLon[][], from: ILatLon): IXY[][] {
  const lonScale = Math.cos((from[0] * Math.PI) / 180) * metresPerDegree;
  return segments.map((s) =>
    s.map(([lat, lon]) => ({ x: (lon - from[1]) * lonScale, y: (lat - from[0]) * metresPerDegree }))
  );
}

function offsetFromLine(p: IXY, a: IXY, b: IXY): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lengthSquared = dx * dx + dy * dy;
  if (lengthSquared === 0) {
    return Math.hypot(p.x - a.x, p.y - a.y);
  }
  const fraction = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / lengthSquared));
  return Math.hypot(p.x - (a.x + fraction * dx), p.y - (a.y + fraction * dy));
}

export function RunRoute_douglasPeucker(points: IXY[], toleranceM: number): number[] {
  if (points.length <= 2) {
    return points.map((_, i) => i);
  }
  const keep = new Set<number>([0, points.length - 1]);
  const stack: [number, number][] = [[0, points.length - 1]];
  let range = stack.pop();
  while (range != null) {
    const [first, last] = range;
    let farthest = -1;
    let farthestOffset = toleranceM;
    for (let i = first + 1; i < last; i += 1) {
      const offset = offsetFromLine(points[i], points[first], points[last]);
      if (offset > farthestOffset) {
        farthest = i;
        farthestOffset = offset;
      }
    }
    if (farthest >= 0) {
      keep.add(farthest);
      stack.push([first, farthest], [farthest, last]);
    }
    range = stack.pop();
  }
  return [...keep].sort((a, b) => a - b);
}

function roundCoordinate(value: number): number {
  return Math.round(value * 100000) / 100000;
}

function boundPoints(segments: ILatLon[][]): ILatLon[][] {
  const count = segments.reduce((sum, line) => sum + line.length, 0);
  if (count < RunRoute_pointLimit) {
    return segments;
  }
  const indices = new Set(
    Array.from({ length: RunRoute_pointLimit - 1 }, (_, i) => Math.round((i * (count - 1)) / (RunRoute_pointLimit - 2)))
  );
  let index = 0;
  return segments
    .map((line) =>
      line.filter(() => {
        const keep = indices.has(index);
        index += 1;
        return keep;
      })
    )
    .filter((line) => line.length > 0);
}

// The tolerance grows until the whole route fits the limit, so short runs keep every corner.
export function RunRoute_simplify(segments: ILatLon[][]): ILatLon[][] {
  const nonEmpty = segments.filter((s) => s.length > 0);
  const from = origin(nonEmpty);
  if (from == null) {
    return [];
  }
  const projected = project(nonEmpty, from);
  let tolerance = startToleranceM;
  let result = nonEmpty;
  for (let round = 0; round < maxRounds; round += 1) {
    result = nonEmpty.map((s, i) => RunRoute_douglasPeucker(projected[i], tolerance).map((index) => s[index]));
    if (result.reduce((sum, s) => sum + s.length, 0) < RunRoute_pointLimit) {
      break;
    }
    tolerance *= toleranceGrowth;
  }
  return boundPoints(result).map((s) => s.map(([lat, lon]) => [roundCoordinate(lat), roundCoordinate(lon)] as ILatLon));
}

function svgNumber(value: number): string {
  return (Math.round(value * 10) / 10).toString();
}

// One scale for x and y, so a square block stays square in the drawing.
export function RunRoute_fit(segments: ILatLon[][], width: number, height: number, padding: number): IRouteDrawing {
  const nonEmpty = segments.filter((s) => s.length > 0);
  const from = origin(nonEmpty);
  if (from == null) {
    return { lines: [], gaps: [] };
  }
  const projected = project(nonEmpty, from);
  const all = projected.flat();
  const minX = Math.min(...all.map((p) => p.x));
  const maxX = Math.max(...all.map((p) => p.x));
  const minY = Math.min(...all.map((p) => p.y));
  const maxY = Math.max(...all.map((p) => p.y));
  const innerW = width - padding * 2;
  const innerH = height - padding * 2;
  const spanX = maxX - minX;
  const spanY = maxY - minY;
  const scale = Math.min(spanX > 0 ? innerW / spanX : Infinity, spanY > 0 ? innerH / spanY : Infinity);
  const s = Number.isFinite(scale) ? scale : 1;
  const left = padding + (innerW - spanX * s) / 2;
  const top = padding + (innerH - spanY * s) / 2;
  const toBox = (p: IXY): IXY => ({ x: left + (p.x - minX) * s, y: top + (maxY - p.y) * s });
  return RunRoute_drawing(projected.map((line) => line.map(toBox)));
}

export function RunRoute_drawing(boxed: IXY[][]): IRouteDrawing {
  const lines = boxed.filter((line) => line.length > 0);
  if (lines.length === 0) {
    return { lines: [], gaps: [] };
  }
  const lastLine = lines[lines.length - 1];
  return {
    lines: lines.map((line) => line.map((p) => `${svgNumber(p.x)},${svgNumber(p.y)}`).join(" ")),
    gaps: lines.slice(1).map((line, i) => ({ from: lines[i][lines[i].length - 1], to: line[0] })),
    start: lines[0][0],
    end: lastLine[lastLine.length - 1],
  };
}

export function RunRoute_flatten(route: ILatLon[][]): IFlatRoute {
  const lines = route.filter((line) => line.length > 0);
  return {
    lats: lines.flatMap((line) => line.map(([lat]) => lat)),
    lons: lines.flatMap((line) => line.map(([, lon]) => lon)),
    lengths: lines.map((line) => line.length),
  };
}

export function RunRoute_split<T>(points: T[], lengths: number[]): T[][] {
  let index = 0;
  return lengths.map((length) => {
    const line = points.slice(index, index + length);
    index += length;
    return line;
  });
}

export function RunRoute_mapDrawing(
  flat: IFlatRoute,
  xs: ReadonlyArray<number>,
  ys: ReadonlyArray<number>
): IRouteDrawing | undefined {
  if (xs.length !== flat.lats.length || ys.length !== flat.lats.length) {
    return undefined;
  }
  const points = xs.map((x, i) => ({ x, y: ys[i] }));
  return RunRoute_drawing(RunRoute_split(points, flat.lengths));
}

function distanceM(a: ILatLon, b: ILatLon): number {
  const lonScale = Math.cos((((a[0] + b[0]) / 2) * Math.PI) / 180) * metresPerDegree;
  return Math.hypot((b[1] - a[1]) * lonScale, (b[0] - a[0]) * metresPerDegree);
}

function between(a: ILatLon, b: ILatLon, fraction: number): ILatLon {
  return [a[0] + (b[0] - a[0]) * fraction, a[1] + (b[1] - a[1]) * fraction];
}

// Pause gaps do not count toward the distance, because the runner was not on the drawn path.
function trimStart(route: ILatLon[][], metres: number): ILatLon[][] {
  let remaining = metres;
  for (let s = 0; s < route.length; s += 1) {
    const line = route[s];
    for (let i = 1; i < line.length; i += 1) {
      const step = distanceM(line[i - 1], line[i]);
      if (step >= remaining) {
        const fraction = remaining / step;
        const kept = fraction < 1 ? [between(line[i - 1], line[i], fraction), ...line.slice(i)] : line.slice(i);
        return [kept, ...route.slice(s + 1)];
      }
      remaining -= step;
    }
  }
  return [];
}

function reversed(route: ILatLon[][]): ILatLon[][] {
  return [...route].reverse().map((line) => [...line].reverse());
}

export function RunRoute_trimEnds(route: ILatLon[][], metres: number): ILatLon[][] {
  if (metres <= 0) {
    return route;
  }
  return reversed(trimStart(reversed(trimStart(route, metres)), metres));
}

export function RunRoute_forCard(route: ILatLon[][], hideEnds: boolean): ILatLon[][] {
  return RunRoute_trimEnds(route, hideEnds ? RunRoute_hiddenEndsM : 0);
}
