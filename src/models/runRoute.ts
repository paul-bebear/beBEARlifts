export type ILatLon = [number, number];

export interface IXY {
  x: number;
  y: number;
}

export interface IRouteDrawing {
  lines: string[];
  start?: IXY;
  end?: IXY;
}

export const RunRoute_pointLimit = 300;

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
    return { lines: [] };
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
  const boxed = projected.map((line) => line.map(toBox));
  const lastLine = boxed[boxed.length - 1];
  return {
    lines: boxed.map((line) => line.map((p) => `${svgNumber(p.x)},${svgNumber(p.y)}`).join(" ")),
    start: boxed[0][0],
    end: lastLine[lastLine.length - 1],
  };
}
