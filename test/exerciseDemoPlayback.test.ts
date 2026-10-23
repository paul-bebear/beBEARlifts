import "mocha";
import { expect } from "chai";
import {
  ExerciseDemoPlayback_delayMs,
  ExerciseDemoPlayback_initial,
  ExerciseDemoPlayback_isPlaying,
  ExerciseDemoPlayback_reduce,
  IExerciseDemoPlayback,
  IExerciseDemoPlaybackEvent,
} from "../src/models/exerciseDemoPlayback";

const media = { frames: 4, columns: 4, frameMs: [1000, 100, 100, 100], bytes: 1 };

function run(events: IExerciseDemoPlaybackEvent[]): IExerciseDemoPlayback {
  return events.reduce((s, e) => ExerciseDemoPlayback_reduce(media, s, e), ExerciseDemoPlayback_initial(media));
}

describe("ExerciseDemoPlayback", () => {
  it("waits on the still frame until the sprite loads", () => {
    const state = ExerciseDemoPlayback_initial(media);
    expect(state.frame).to.equal(0);
    expect(ExerciseDemoPlayback_isPlaying(state)).to.equal(false);
    expect(ExerciseDemoPlayback_delayMs(media, state)).to.equal(undefined);
  });

  it("plays after loading and waits each frame's own duration", () => {
    const loaded = run([{ type: "loaded" }]);
    expect(ExerciseDemoPlayback_isPlaying(loaded)).to.equal(true);
    expect(ExerciseDemoPlayback_delayMs(media, loaded)).to.equal(1000);
    const next = ExerciseDemoPlayback_reduce(media, loaded, { type: "tick" });
    expect(next.frame).to.equal(1);
    expect(ExerciseDemoPlayback_delayMs(media, next)).to.equal(100);
  });

  it("loops back to the first frame", () => {
    const state = run([{ type: "loaded" }, { type: "tick" }, { type: "tick" }, { type: "tick" }, { type: "tick" }]);
    expect(state.frame).to.equal(0);
  });

  it("stops advancing when paused", () => {
    const paused = run([{ type: "loaded" }, { type: "tick" }, { type: "toggled" }]);
    expect(ExerciseDemoPlayback_isPlaying(paused)).to.equal(false);
    expect(ExerciseDemoPlayback_reduce(media, paused, { type: "tick" }).frame).to.equal(1);
    expect(ExerciseDemoPlayback_delayMs(media, paused)).to.equal(undefined);
  });

  it("stays on the still frame with reduce motion until the user taps play", () => {
    const still = run([{ type: "loaded" }, { type: "tick" }, { type: "reduceMotion", enabled: true }]);
    expect(still.frame).to.equal(0);
    expect(ExerciseDemoPlayback_isPlaying(still)).to.equal(false);
    const played = ExerciseDemoPlayback_reduce(media, still, { type: "toggled" });
    expect(ExerciseDemoPlayback_isPlaying(played)).to.equal(true);
  });

  it("keeps the user's play choice when reduce motion turns on later", () => {
    const state = run([{ type: "reduceMotion", enabled: true }, { type: "loaded" }, { type: "toggled" }]);
    const after = ExerciseDemoPlayback_reduce(media, state, { type: "reduceMotion", enabled: true });
    expect(ExerciseDemoPlayback_isPlaying(after)).to.equal(true);
  });

  it("ignores play taps before the sprite loads and after it fails", () => {
    expect(run([{ type: "toggled" }]).userWantsPlay).to.equal(undefined);
    const failed = run([{ type: "failed" }, { type: "toggled" }]);
    expect(failed.load).to.equal("failed");
    expect(ExerciseDemoPlayback_isPlaying(failed)).to.equal(false);
  });
});
