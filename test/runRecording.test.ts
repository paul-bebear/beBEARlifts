import "mocha";
import { expect } from "chai";
import {
  RunRecording_addPoint,
  RunRecording_checkStale,
  RunRecording_gapRule,
  RunRecording_gpsErrorText,
  RunRecording_hasFreshFix,
  RunRecording_isSaveDue,
  RunRecording_markHidden,
  RunRecording_clearsGpsError,
  RunRecording_fixText,
  RunRecording_onFix,
  RunRecording_onTick,
  RunRecording_stats,
  RunRecording_recentPace,
  RunRecording_parse,
  RunRecording_pause,
  RunRecording_pauseStale,
  RunRecording_permissionText,
  RunRecording_pointCount,
  RunRecording_restore,
  RunRecording_resume,
  RunRecording_screenHints,
  RunRecording_snapshot,
  RunRecording_splitStale,
  RunRecording_start,
  RunRecording_toRun,
} from "../src/models/runRecording";
import { IRunPoint, RunTrack_stats } from "../src/models/runTrack";

const a: IRunPoint = { t: 1000, lat: 40, lon: -3, acc: 5 };
const b: IRunPoint = { ...a, t: 11000, lat: 40.0001 };

describe("RunRecording", () => {
  it("pauses on screen lock and excludes the lock gap from live and saved moving time", () => {
    let run = RunRecording_addPoint(RunRecording_addPoint(RunRecording_start(1000), a), b);
    run = RunRecording_markHidden(run, 12000);
    expect(run.status).to.equal("paused");
    expect(run.pausedByScreen).to.equal(true);
    expect(run.segments[0].endedAt).to.equal(12000);
    expect(RunRecording_markHidden(run, 612000)).to.equal(run);
    expect(RunTrack_stats(run.segments, 612000).movingMs).to.equal(11000);
    expect(RunRecording_toRun(run, 612000)?.movingMs).to.equal(11000);
    run = RunRecording_resume(run, 612000);
    expect(run.pausedByScreen).to.equal(false);
    run = RunRecording_addPoint(run, { ...a, t: 612000, lat: 41 });
    run = RunRecording_addPoint(run, { ...b, t: 622000, lat: 41.0001 });
    const saved = RunRecording_toRun(run, 623000)!;
    expect(saved.movingMs).to.equal(22000);
    expect(saved.distanceM).to.be.lessThan(30);
    expect(saved.route).to.have.length(2);
  });

  it("closes at the later of the screen event and the last fix", () => {
    const run = RunRecording_addPoint(RunRecording_start(1000), b);
    expect(RunRecording_markHidden(run, 10000).segments[0].endedAt).to.equal(11000);
    const manual = RunRecording_pause(run, 12000);
    expect(RunRecording_markHidden(manual, 13000)).to.equal(manual);
    expect(manual.pausedByScreen).to.equal(undefined);
  });

  it("pauses stale GPS at the last fix even when the tick runs ten minutes late", () => {
    const run = RunRecording_addPoint(RunRecording_addPoint(RunRecording_start(1000), a), b);
    expect(RunRecording_pauseStale(run, 25999)).to.equal(run);
    const paused = RunRecording_pauseStale(run, 26000);
    expect(paused.status).to.equal("paused");
    expect(paused.segments[0].endedAt).to.equal(11000);
    expect(RunRecording_pauseStale(paused, 611000)).to.equal(paused);
    expect(RunRecording_toRun(run, 611000)?.movingMs).to.equal(10000);
    expect(RunTrack_stats(RunRecording_pauseStale(run, 611000).segments, 611000).movingMs).to.equal(10000);
    const lateFix = RunRecording_addPoint(run, { ...b, t: 611000, lat: 41 });
    expect(lateFix.status).to.equal("paused");
    expect(RunRecording_pointCount(lateFix)).to.equal(2);
    expect(lateFix.segments[0].endedAt).to.equal(11000);
  });

  it("keeps an iOS run recording through a GPS gap and leaves the gap out of time and distance", () => {
    expect(RunRecording_gapRule("ios")).to.equal("split");
    expect(RunRecording_gapRule("web")).to.equal("pause");
    let run = RunRecording_addPoint(RunRecording_addPoint(RunRecording_start(1000), a, "split"), b, "split");
    expect(RunRecording_checkStale(run, 25999, "split")).to.equal(run);
    expect(RunRecording_checkStale(run, 611000, "pause").status).to.equal("paused");
    run = RunRecording_addPoint(run, { ...a, t: 611000, lat: 41 }, "split");
    run = RunRecording_addPoint(run, { ...b, t: 621000, lat: 41.0001 }, "split");
    expect(run.status).to.equal("recording");
    expect(run.segments).to.have.length(2);
    expect(run.segments[0].endedAt).to.equal(11000);
    expect(run.segments[1].startedAt).to.equal(611000);
    const saved = RunRecording_toRun(run, 621000)!;
    expect(saved.movingMs).to.equal(20000);
    expect(saved.distanceM).to.be.lessThan(30);
  });

  it("leaves an open iOS gap out of moving time when the runner pauses before the next fix", () => {
    let run = RunRecording_addPoint(RunRecording_addPoint(RunRecording_start(1000), a, "split"), b, "split");
    for (let at = 12000; at <= 251000; at += 1000) {
      run = RunRecording_onTick(run, at, "split").recording;
    }
    expect(run.status).to.equal("recording");
    expect(run.segments[0].endedAt).to.equal(11000);
    const paused = RunRecording_pause(run, 251000);
    expect(RunTrack_stats(paused.segments, 251000).movingMs).to.be.lessThan(10000 + 15000);
    expect(RunRecording_toRun(RunRecording_restore(run), 251000)!.movingMs).to.be.lessThan(10000 + 15000);
  });

  it("stops the iOS clock at the last fix so it never runs backward after a gap", () => {
    let run = RunRecording_addPoint(RunRecording_addPoint(RunRecording_start(1000), a, "split"), b, "split");
    const shown: number[] = [];
    for (let at = 12000; at <= 60000; at += 1000) {
      run = RunRecording_onTick(run, at, "split").recording;
      shown.push(RunRecording_stats(run, at, "split").movingMs);
    }
    run = RunRecording_onFix(run, { ...a, t: 61000, lat: 41 }, "split", 61000).recording;
    shown.push(RunRecording_stats(run, 61000, "split").movingMs);
    run = RunRecording_onFix(run, { ...b, t: 62000, lat: 41.0001 }, "split", 62000).recording;
    shown.push(RunRecording_stats(run, 62000, "split").movingMs);
    expect(shown.every((ms, i) => i === 0 || ms >= shown[i - 1])).to.equal(true);
    expect(shown[shown.length - 1]).to.equal(11000);
    expect(RunRecording_stats(run, 70000, "split").movingMs).to.equal(11000);
    expect(RunRecording_stats(run, 70000, "pause").movingMs).to.equal(19000);
  });

  it("saves when a fix or a tick reshapes the run, and otherwise every 10 seconds", () => {
    const run = RunRecording_snapshot(RunRecording_addPoint(RunRecording_start(1000), a, "split"), 1000);
    expect(RunRecording_onFix(run, { ...b, t: 2000 }, "split", 2000).save).to.equal(false);
    expect(RunRecording_onFix(run, { ...b, t: 30000 }, "split", 30000).save).to.equal(true);
    expect(RunRecording_onFix(run, { ...b, t: 11000 }, "split", 11000).save).to.equal(true);
    expect(RunRecording_onTick(run, 5000, "split").save).to.equal(false);
    expect(RunRecording_onTick(run, 20000, "split").save).to.equal(true);
  });

  it("keeps a GPS error on screen until a fix is accurate enough to use", () => {
    expect(RunRecording_clearsGpsError({ ...a, acc: 1500 })).to.equal(false);
    expect(RunRecording_clearsGpsError({ ...a, acc: 25 })).to.equal(true);
  });

  it("starts the iOS clock at the first fix when GPS is slow to answer", () => {
    const run = RunRecording_addPoint(RunRecording_start(1000), { ...a, t: 40000 }, "split");
    expect(run.status).to.equal("recording");
    expect(run.segments).to.deep.equal([{ startedAt: 40000, points: [{ ...a, t: 40000 }] }]);
    expect(RunRecording_splitStale(run, 41000)).to.equal(run);
  });

  it("waits 15 seconds for an initial fix after start or resume", () => {
    const run = RunRecording_start(1000);
    expect(RunRecording_pauseStale(run, 15999)).to.equal(run);
    expect(RunRecording_pauseStale(run, 16000).segments[0].endedAt).to.equal(1000);
    const resumed = RunRecording_resume(RunRecording_pause(run, 2000), 100000);
    expect(RunRecording_pauseStale(resumed, 114999)).to.equal(resumed);
    expect(RunRecording_pauseStale(resumed, 115000).status).to.equal("paused");
  });

  it("preserves the screen pause reason in a saved draft", () => {
    const run = RunRecording_markHidden(RunRecording_addPoint(RunRecording_start(1000), a), 2000);
    const parsed = RunRecording_parse(JSON.parse(JSON.stringify(run)))!;
    expect(parsed.pausedByScreen).to.equal(true);
    expect(RunRecording_restore(parsed).segments[0].endedAt).to.equal(2000);
    expect(RunRecording_toRun(parsed, 3000)).to.equal(undefined);
  });

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
    expect(RunRecording_fixText(run, 30000, "web")).to.include("Keep the app open");
    expect(RunRecording_fixText(run, 30000, "ios")).to.equal("Waiting for GPS. Stay outside.");
    expect(RunRecording_fixText(run, 11000, "web")).to.equal("GPS ±5 m");
    run = RunRecording_resume(RunRecording_pause(run, 12000), 30000);
    expect(RunRecording_addPoint(run, { ...b, t: 20000 })).to.equal(run);
    expect(RunRecording_fixText(RunRecording_pause(run, 31000), 31000, "web")).to.equal("GPS paused");
    expect(RunRecording_fixText(RunRecording_addPoint(run, { ...b, t: 31000, acc: 50 }), 31000, "web")).to.include(
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
    expect(RunRecording_gpsErrorText(1, "web")).to.include("Safari Websites");
    expect(RunRecording_gpsErrorText(2, "web")).to.include("No GPS signal");
    expect(RunRecording_gpsErrorText(3, "web")).to.include("Keep the app open");
  });

  it("writes iOS error text without Safari steps", () => {
    expect(RunRecording_gpsErrorText(1, "ios")).to.include("Settings, beBEAR, Location");
    expect(RunRecording_gpsErrorText(1, "ios")).not.to.include("Safari");
    expect(RunRecording_gpsErrorText(2, "ios")).to.include("No GPS signal");
    expect(RunRecording_gpsErrorText(3, "ios")).not.to.include("Keep the app open");
    expect(RunRecording_gpsErrorText(4, "ios")).to.include("Precise Location");
  });

  it("blocks the start only when location is denied or approximate", () => {
    expect(RunRecording_permissionText("granted", "ios")).to.equal(undefined);
    expect(RunRecording_permissionText("denied", "ios")).to.equal(RunRecording_gpsErrorText(1, "ios"));
    expect(RunRecording_permissionText("approximate", "ios")).to.include("Precise Location");
    expect(RunRecording_permissionText("denied", "web")).to.include("Safari Websites");
  });

  it("tells iOS runners they can lock the phone and web runners to keep the screen on", () => {
    expect(RunRecording_screenHints("ios", false)).to.deep.equal({
      lock: "You can lock the phone. GPS keeps recording.",
    });
    expect(RunRecording_screenHints("web", true)).to.deep.equal({
      lock: "Keep the screen on. Locking the phone stops GPS.",
    });
    expect(RunRecording_screenHints("web", false).warning).to.include("wake lock is unavailable");
  });
});
