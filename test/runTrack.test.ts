import "mocha";
import { expect } from "chai";
import {
  IRunPoint,
  RunTrack_distanceM,
  RunTrack_elevationGainM,
  RunTrack_formatDuration,
  RunTrack_formatKm,
  RunTrack_formatPace,
  RunTrack_judge,
  RunTrack_recentPace,
  RunTrack_stats,
} from "../src/models/runTrack";

export function point(metres: number, t: number, acc = 5): IRunPoint {
  return { lat: metres / ((6371000 * Math.PI) / 180), lon: 0, t, acc };
}

describe("RunTrack", () => {
  it("filters accuracy, jumps, stationary steps and stale timestamps", () => {
    const a = point(0, 1000);
    expect(RunTrack_judge(undefined, a)).to.equal("keep");
    expect(RunTrack_judge(a, point(10, 6000, 26))).to.equal("inaccurate");
    expect(RunTrack_judge(a, point(20, 2000))).to.equal("jump");
    expect(RunTrack_judge(a, point(4, 6000))).to.equal("still");
    expect(RunTrack_judge(a, point(10, 1000))).to.equal("stale");
    expect(RunTrack_judge(a, point(10, 900))).to.equal("stale");
    expect(RunTrack_judge(a, point(10, 6000, 25))).to.equal("keep");
    expect(RunTrack_distanceM(a, point(1000, 1000))).to.be.closeTo(1000, 0.001);
  });

  it("interpolates two full km splits on a straight track", () => {
    const points = Array.from({ length: 202 }, (_, i) => point(i * 10, i * 3000));
    const stats = RunTrack_stats([{ startedAt: 0, endedAt: 603000, points }], 603000);
    expect(stats.distanceM).to.be.closeTo(2010, 0.001);
    expect(stats.splits).to.deep.equal([
      { km: 1, ms: 300000 },
      { km: 2, ms: 300000 },
    ]);
    expect(stats.paceSecPerKm).to.be.closeTo(300, 0.001);
    expect(stats.fastestKm?.km).to.equal(1);
    expect(RunTrack_recentPace({ startedAt: 0, points })).to.be.closeTo(300, 0.001);
  });

  it("leaves paused time and the gap between segments out of distance and splits", () => {
    const stats = RunTrack_stats(
      [
        { startedAt: 0, endedAt: 150000, points: [point(0, 0), point(500, 150000)] },
        { startedAt: 210000, endedAt: 360000, points: [point(2000, 210000), point(2501, 360000)] },
      ],
      900000
    );
    expect(stats.movingMs).to.equal(300000);
    expect(stats.distanceM).to.be.closeTo(1001, 0.001);
    expect(stats.splits[0].ms).to.be.closeTo(299701, 1);
  });

  it("ignores altitude noise and counts sustained climbs", () => {
    expect(RunTrack_elevationGainM([100, 101, 99, 100, 102, 101, 100])).to.equal(0);
    expect(RunTrack_elevationGainM([])).to.equal(0);
    expect(RunTrack_elevationGainM([0, 0, 0, 5, 10, 15, 20, 20, 20])).to.be.greaterThan(10);
  });

  it("formats rounded pace and elapsed time", () => {
    expect(RunTrack_formatPace(299.6)).to.equal("5:00 /km");
    expect(RunTrack_formatPace(undefined)).to.equal("–:–– /km");
    expect(RunTrack_formatDuration(3661000)).to.equal("1:01:01");
    expect(RunTrack_formatDuration(-100)).to.equal("0:00");
    expect(RunTrack_formatKm(1234)).to.equal("1.23");
    expect(RunTrack_recentPace(undefined)).to.equal(undefined);
  });
});
