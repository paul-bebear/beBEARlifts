import "mocha";
import { expect } from "chai";
import {
  IRunFinishState,
  RunFinish_close,
  RunFinish_idle,
  RunFinish_isClosing,
  RunFinish_mountPlan,
  RunFinish_next,
  RunFinish_saveEffects,
  RunFinish_startPlan,
} from "../src/models/runFinish";
import {
  RunRecording_addPoint,
  RunRecording_markHidden,
  RunRecording_pause,
  RunRecording_pauseStale,
  RunRecording_start,
  RunRecording_toRun,
} from "../src/models/runRecording";
import { IRunPoint } from "../src/models/runTrack";

const a: IRunPoint = { t: 1000, lat: 40, lon: -3, acc: 5 };
const b: IRunPoint = { ...a, t: 11000, lat: 40.0002 };

function recordingWithTwoPoints(): ReturnType<typeof RunRecording_start> {
  return RunRecording_addPoint(RunRecording_addPoint(RunRecording_start(1000), a), b);
}

function confirmedFinish(): IRunFinishState {
  const asked = RunFinish_next(RunFinish_idle(), { type: "tapped" });
  return RunFinish_next(asked.state, { type: "answered", confirmed: true }).state;
}

describe("RunFinish", () => {
  it("closes a normal run the way the recorder used to, and keeps the same run", () => {
    const recording = recordingWithTwoPoints();
    const now = 13000;
    const closed = RunFinish_close(recording, now);
    const before = RunRecording_pause(RunRecording_pauseStale(recording, now), now);
    expect(closed.recording).to.deep.equal(before);
    expect(closed.run).to.deep.equal(RunRecording_toRun(before, now));
    expect(closed.run?.route.length).to.equal(1);
    expect(closed.recording.status).to.equal("paused");
  });

  it("returns no run when there are fewer than two GPS points", () => {
    expect(RunFinish_close(RunRecording_start(1000), 5000).run).to.equal(undefined);
    expect(RunFinish_close(RunRecording_addPoint(RunRecording_start(1000), a), 5000).run).to.equal(undefined);
  });

  it("keeps a very short run with exactly two points", () => {
    const run = RunFinish_close(recordingWithTwoPoints(), 12000).run;
    expect(run).not.to.equal(undefined);
    expect(run!.startedAt).to.equal(1000);
  });

  it("saves the run before it clears the draft, and shows the run last", () => {
    const run = RunFinish_close(recordingWithTwoPoints(), 12000).run!;
    expect(RunFinish_saveEffects(run).map((e) => e.type)).to.deep.equal(["save-run", "clear-draft", "show"]);
    expect(RunFinish_saveEffects(undefined).map((e) => e.type)).to.deep.equal([
      "alert-too-short",
      "clear-draft",
      "show",
    ]);
  });

  it("asks once, ignores a second tap, and closes only after a yes", () => {
    const first = RunFinish_next(RunFinish_idle(), { type: "tapped" });
    expect(first.effects).to.deep.equal([{ type: "ask" }]);
    expect(RunFinish_next(first.state, { type: "tapped" }).effects).to.deep.equal([]);
    expect(RunFinish_isClosing(first.state)).to.equal(false);
    const yes = RunFinish_next(first.state, { type: "answered", confirmed: true });
    expect(yes.effects).to.deep.equal([{ type: "close" }]);
    expect(RunFinish_isClosing(yes.state)).to.equal(true);
    expect(RunFinish_next(yes.state, { type: "tapped" }).effects).to.deep.equal([]);
  });

  it("goes back to idle when the runner says no", () => {
    const asked = RunFinish_next(RunFinish_idle(), { type: "tapped" });
    const no = RunFinish_next(asked.state, { type: "answered", confirmed: false });
    expect(no.state).to.deep.equal(RunFinish_idle());
    expect(no.effects).to.deep.equal([]);
  });

  it("resets and reports when the save fails, so Finish works again", () => {
    const failed = RunFinish_next(confirmedFinish(), { type: "failed" });
    expect(failed.effects).to.deep.equal([{ type: "report-failure" }]);
    expect(RunFinish_isClosing(failed.state)).to.equal(false);
    expect(RunFinish_next(failed.state, { type: "tapped" }).effects).to.deep.equal([{ type: "ask" }]);
  });

  it("stays closing after a saved run, so no timer rewrites the cleared draft", () => {
    const saved = RunFinish_next(confirmedFinish(), { type: "saved" });
    expect(saved.effects).to.deep.equal([]);
    expect(RunFinish_isClosing(saved.state)).to.equal(true);
    expect(RunFinish_next(saved.state, { type: "tapped" }).effects).to.deep.equal([]);
  });

  it("ignores answers and results that arrive with no finish in progress", () => {
    const idle = RunFinish_idle();
    expect(RunFinish_next(idle, { type: "answered", confirmed: true }).effects).to.deep.equal([]);
    expect(RunFinish_next(idle, { type: "failed" }).effects).to.deep.equal([]);
    expect(RunFinish_next(idle, { type: "saved" }).state).to.equal(idle);
  });

  it("finishes a run that went to the background during recording", () => {
    const hidden = RunRecording_markHidden(recordingWithTwoPoints(), 12000);
    const closed = RunFinish_close(hidden, 90000);
    expect(closed.recording.pausedByScreen).to.equal(true);
    expect(closed.run?.movingMs).to.equal(RunRecording_toRun(hidden, 90000)?.movingMs);
    expect(closed.run!.endedAt).to.equal(90000);
  });

  it("starts blocked with a text, or begins a saved recording", () => {
    expect(RunFinish_startPlan("Location is off", 5)).to.deep.equal({ type: "blocked", text: "Location is off" });
    const plan = RunFinish_startPlan(undefined, 5);
    expect(plan.type === "begin" && plan.recording.startedAt).to.equal(5);
    expect(plan.type === "begin" && plan.recording.savedAt).to.equal(5);
  });

  it("restores a saved draft paused and rewrites it, and does nothing with no draft", () => {
    expect(RunFinish_mountPlan(undefined)).to.deep.equal({ recording: undefined, rewriteDraft: false });
    const plan = RunFinish_mountPlan(recordingWithTwoPoints());
    expect(plan.rewriteDraft).to.equal(true);
    expect(plan.recording?.status).to.equal("paused");
    expect(plan.recording?.wasRestored).to.equal(true);
  });
});
