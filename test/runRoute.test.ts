import "mocha";
import { expect } from "chai";
import { ILatLon, RunRoute_douglasPeucker, RunRoute_fit, RunRoute_simplify } from "../src/models/runRoute";

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
    expect(RunRoute_fit([], 300, 200, 10)).to.deep.equal({ lines: [] });
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
});
