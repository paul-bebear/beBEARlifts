import "mocha";
import { expect } from "chai";
import {
  RunRecording_addPoint,
  RunRecording_gpsErrorText,
  RunRecording_hasFreshFix,
  RunRecording_isSaveDue,
  RunRecording_fixText,
  RunRecording_recentPace,
  RunRecording_parse,
  RunRecording_pause,
  RunRecording_pointCount,
  RunRecording_restore,
  RunRecording_resume,
  RunRecording_snapshot,
  RunRecording_start,
  RunRecording_toRun,
} from "../src/models/runRecording";
import { IRunPoint } from "../src/models/runTrack";

const a: IRunPoint = { t: 1000, lat: 40, lon: -3, acc: 5 };
const b: IRunPoint = { ...a, t: 11000, lat: 40.0001 };

describe("RunRecording", () => {
  it("records accepted points, counts bad fixes, and ignores movement during a pause", () => {
    let run = RunRecording_addPoint(RunRecording_start(1000), a);
    run = RunRecording_addPoint(run, { ...b, acc: 50 });
    expect(run.dropped).to.equal(1);
    run = RunRecording_addPoint(run, b);
    run = RunRecording_pause(run, 12000);
    run = RunRecording_addPoint(run, { ...b, t: 20000 });
    expect(RunRecording_pointCount(run)).to.equal(2);
    expect(RunRecording_pause(run, 25000)).to.equal(run);
    run = RunRecording_resume(run, 30000);
    expect(RunRecording_resume(run, 40000)).to.equal(run);
    expect(run.segments).to.have.length(2);
    expect(run.segments[0].endedAt).to.equal(12000);
    expect(run.segments[1].startedAt).to.equal(30000);
    expect(RunRecording_toRun(run, 31000)?.movingMs).to.equal(12000);
  });

  it("restores a recording paused at the last saved moment", () => {
    const snapshot = RunRecording_snapshot(RunRecording_addPoint(RunRecording_start(1000), a), 9000);
    const restored = RunRecording_restore(RunRecording_parse(JSON.parse(JSON.stringify(snapshot)))!);
    expect(restored.status).to.equal("paused");
    expect(restored.wasRestored).to.equal(true);
    expect(restored.segments[0].endedAt).to.equal(9000);
    expect(RunRecording_resume(restored, 100000).wasRestored).to.equal(false);
    expect(RunRecording_restore(RunRecording_pause(snapshot, 10000)).segments[0].endedAt).to.equal(10000);
  });

  it("saves every 10 seconds and reports stale fixes", () => {
    const run = RunRecording_addPoint(RunRecording_start(1000), a);
    expect(RunRecording_isSaveDue(undefined, 1000)).to.equal(true);
    expect(RunRecording_isSaveDue(1000, 10999)).to.equal(false);
    expect(RunRecording_isSaveDue(1000, 11000)).to.equal(true);
    expect(RunRecording_hasFreshFix(run, 15999)).to.equal(true);
    expect(RunRecording_hasFreshFix(run, 16000)).to.equal(false);
    expect(RunRecording_toRun(run, 10000)).to.equal(undefined);
  });

  it("rejects delayed fixes from before resume and never displays a stale recent pace", () => {
    let run = RunRecording_addPoint(RunRecording_addPoint(RunRecording_start(1000), a), b);
    expect(RunRecording_recentPace(run, 11000)).to.be.greaterThan(0);
    expect(RunRecording_recentPace(run, 30000)).to.equal(undefined);
    expect(RunRecording_fixText(run, 30000)).to.include("Waiting for GPS");
    expect(RunRecording_fixText(run, 11000)).to.equal("GPS ±5 m");
    run = RunRecording_resume(RunRecording_pause(run, 12000), 30000);
    expect(RunRecording_addPoint(run, { ...b, t: 20000 })).to.equal(run);
    expect(RunRecording_fixText(RunRecording_pause(run, 31000), 31000)).to.equal("GPS paused");
    expect(RunRecording_fixText(RunRecording_addPoint(run, { ...b, t: 31000, acc: 50 }), 31000)).to.include(
      "within 25 m"
    );
  });

  it("rejects malformed drafts and round trips a paused run", () => {
    expect(RunRecording_parse(null)).to.equal(undefined);
    expect(RunRecording_parse({ startedAt: 1, status: "paused", segments: [] })).to.equal(undefined);
    const run = RunRecording_pause(RunRecording_addPoint(RunRecording_start(1000), a), 2000);
    const { lastFix, ...stored } = run;
    expect(lastFix).to.deep.equal({ t: a.t, acc: a.acc });
    expect(RunRecording_parse(JSON.parse(JSON.stringify(run)))).to.deep.equal(stored);
    expect(RunRecording_gpsErrorText(1)).to.include("Location is blocked");
    expect(RunRecording_gpsErrorText(2)).to.include("No GPS signal");
    expect(RunRecording_gpsErrorText(3)).to.include("keeps trying");
  });
});
