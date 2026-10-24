import "mocha";
import { expect } from "chai";
import {
  ILatLon,
  RunRoute_douglasPeucker,
  RunRoute_drawing,
  RunRoute_fit,
  RunRoute_flatten,
  RunRoute_forCard,
  RunRoute_mapDrawing,
  RunRoute_simplify,
  RunRoute_split,
  RunRoute_trimEnds,
} from "../src/models/runRoute";

const metresPerDegreeLat = (6371000 * Math.PI) / 180;

function northM(metres: number): number {
  return metres / metresPerDegreeLat;
}

function pathLengthM(route: ILatLon[][]): number {
  return route.reduce(
    (sum, line) => sum + line.slice(1).reduce((s, p, i) => s + Math.abs(p[0] - line[i][0]) * metresPerDegreeLat, 0),
    0
  );
}

describe("RunRoute", () => {
  it("simplifies a winding route below 300 points and keeps its endpoints", () => {
    const route: ILatLon[] = Array.from({ length: 2000 }, (_, i) => [40 + i / 100000, -3 + Math.sin(i / 10) / 1000]);
    const simplified = RunRoute_simplify([route]);
    expect(simplified[0].length).to.be.lessThan(300);
    expect(simplified[0][0]).to.deep.equal([40, -3]);
    expect(simplified[0].slice(-1)[0][0]).to.equal(40.01999);
    for (const p of simplified[0]) {
      expect(p[1]).to.equal(Math.round(p[1] * 100000) / 100000);
    }
  });

  it("preserves segment breaks and handles empty or repeated points", () => {
    expect(RunRoute_simplify([])).to.deep.equal([]);
    expect(RunRoute_fit([], 300, 200, 10)).to.deep.equal({ lines: [], gaps: [] });
    expect(RunRoute_fit([[[0, 0]]], 300, 200, 10).start).to.deep.equal({ x: 150, y: 100 });
    expect(
      RunRoute_simplify([
        [
          [0, 0],
          [0, 0],
        ],
        [],
        [[1, 1]],
      ])
    ).to.have.length(2);
    expect(
      RunRoute_douglasPeucker(
        [
          { x: 0, y: 0 },
          { x: 5, y: 5 },
          { x: 10, y: 0 },
        ],
        1
      )
    ).to.deep.equal([0, 1, 2]);
  });

  it("fits one scale on both axes and points north upwards", () => {
    const fit = RunRoute_fit(
      [
        [
          [0, 0],
          [0, 0.01],
          [0.01, 0.01],
        ],
      ],
      300,
      200,
      10
    );
    const points = fit.lines[0].split(" ").map((p) => p.split(",").map(Number));
    expect(points[1][0] - points[0][0]).to.be.closeTo(points[1][1] - points[2][1], 0.1);
    expect(points[0][0]).to.equal(60);
    expect(points[2][1]).to.equal(10);
    expect(fit.start).to.deep.equal({ x: 60, y: 190 });
  });

  it("keeps out-and-back turns that extend beyond a segment endpoint", () => {
    expect(
      RunRoute_douglasPeucker(
        [
          { x: 0, y: 0 },
          { x: 20, y: 0 },
          { x: 10, y: 0 },
        ],
        1
      )
    ).to.deep.equal([0, 1, 2]);
  });

  it("bounds routes with hundreds of pauses without joining separate stretches", () => {
    const segments: ILatLon[][] = Array.from({ length: 400 }, (_, i) => [
      [i / 1000, 0],
      [i / 1000, 0.001],
    ]);
    const route = RunRoute_simplify(segments);
    expect(route.flat().length).to.be.lessThan(300);
    expect(route[0][0]).to.deep.equal([0, 0]);
    expect(route.slice(-1)[0].slice(-1)[0]).to.deep.equal([0.399, 0.001]);
    for (const line of route) {
      expect(line.every((p) => p[0] === line[0][0])).to.equal(true);
    }
  });

  it("connects each pause gap from the end of one line to the start of the next", () => {
    const drawing = RunRoute_drawing([
      [
        { x: 0, y: 0 },
        { x: 10, y: 0 },
      ],
      [],
      [
        { x: 20, y: 5 },
        { x: 30, y: 5 },
      ],
    ]);
    expect(drawing.lines).to.deep.equal(["0,0 10,0", "20,5 30,5"]);
    expect(drawing.gaps).to.deep.equal([{ from: { x: 10, y: 0 }, to: { x: 20, y: 5 } }]);
    expect(drawing.start).to.deep.equal({ x: 0, y: 0 });
    expect(drawing.end).to.deep.equal({ x: 30, y: 5 });
    expect(RunRoute_drawing([]).gaps).to.deep.equal([]);
  });

  it("flattens a route for the native map and splits the answer back into lines", () => {
    const route: ILatLon[][] = [
      [
        [1, 2],
        [3, 4],
      ],
      [],
      [[5, 6]],
    ];
    const flat = RunRoute_flatten(route);
    expect(flat).to.deep.equal({ lats: [1, 3, 5], lons: [2, 4, 6], lengths: [2, 1] });
    expect(RunRoute_split(["a", "b", "c"], flat.lengths)).to.deep.equal([["a", "b"], ["c"]]);
    const drawing = RunRoute_mapDrawing(flat, [0, 10, 20], [5, 5, 15]);
    expect(drawing?.lines).to.deep.equal(["0,5 10,5", "20,15"]);
    expect(drawing?.gaps).to.deep.equal([{ from: { x: 10, y: 5 }, to: { x: 20, y: 15 } }]);
    expect(RunRoute_mapDrawing(flat, [0, 10], [5, 5])).to.equal(undefined);
  });

  it("hides 50 m at each end along the path, cutting inside a long straight", () => {
    const route: ILatLon[][] = [
      [
        [0, 0],
        [northM(300), 0],
      ],
      [
        [northM(400), 0],
        [northM(500), 0],
      ],
    ];
    const trimmed = RunRoute_forCard(route, true);
    expect(trimmed).to.have.length(2);
    expect(trimmed[0][0][0]).to.be.closeTo(northM(50), 1e-9);
    expect(trimmed[1][trimmed[1].length - 1][0]).to.be.closeTo(northM(450), 1e-9);
    expect(pathLengthM(trimmed)).to.be.closeTo(400 - 100, 0.01);
    expect(RunRoute_forCard(route, false)).to.equal(route);
  });

  it("drops a pause-gap line that sits wholly inside the hidden end", () => {
    const route: ILatLon[][] = [
      [
        [0, 0],
        [northM(20), 0],
      ],
      [
        [northM(100), 0],
        [northM(400), 0],
      ],
    ];
    const trimmed = RunRoute_trimEnds(route, 50);
    expect(trimmed).to.have.length(1);
    expect(trimmed[0][0][0]).to.be.closeTo(northM(130), 1e-9);
  });

  it("hides the whole route when it is shorter than both ends together", () => {
    expect(
      RunRoute_trimEnds(
        [
          [
            [0, 0],
            [northM(80), 0],
          ],
        ],
        50
      )
    ).to.deep.equal([]);
  });
});
