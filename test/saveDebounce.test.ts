import "mocha";
import { expect } from "chai";
import {
  ISaveDebounceTimers,
  SaveDebounce_controller,
  SaveDebounce_empty,
  SaveDebounce_failed,
  SaveDebounce_flush,
  SaveDebounce_quietMs,
  SaveDebounce_saved,
  SaveDebounce_type,
} from "../src/models/saveDebounce";

function fakeTimers(): { timers: ISaveDebounceTimers; fire: () => void; isArmed: () => boolean } {
  let run: (() => void) | undefined;
  return {
    timers: {
      set: (fn) => {
        run = fn;
        return 1;
      },
      clear: () => {
        run = undefined;
      },
    },
    fire: () => {
      const fn = run;
      run = undefined;
      fn?.();
    },
    isArmed: () => run != null,
  };
}

function settle(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

describe("SaveDebounce", () => {
  it("restarts the timer on each key and saves the last value once", () => {
    const first = SaveDebounce_type(SaveDebounce_empty<string>(), "a");
    expect(first.effects).to.eql([{ kind: "startTimer", ms: SaveDebounce_quietMs }]);
    const second = SaveDebounce_type(first.state, "ab");
    expect(SaveDebounce_flush(second.state).effects).to.eql([{ kind: "clearTimer" }, { kind: "save", value: "ab" }]);
  });

  it("does nothing on flush when nothing is pending", () => {
    expect(SaveDebounce_flush(SaveDebounce_empty<string>()).effects).to.eql([]);
  });

  it("keeps a failed value for the next flush and stops the timer", () => {
    const failed = SaveDebounce_failed(SaveDebounce_empty<string>(), "ab").state;
    expect(SaveDebounce_type(failed, "abc").effects).to.eql([]);
    expect(SaveDebounce_flush(failed).effects).to.eql([{ kind: "clearTimer" }, { kind: "save", value: "ab" }]);
  });

  it("restarts the timer after a save works while text waits", () => {
    const held = SaveDebounce_type(SaveDebounce_failed(SaveDebounce_empty<string>(), "a").state, "ab").state;
    expect(SaveDebounce_saved(held).effects).to.eql([{ kind: "startTimer", ms: SaveDebounce_quietMs }]);
  });

  it("writes once for a burst of keys", async () => {
    const saved: string[] = [];
    const clock = fakeTimers();
    const saver = SaveDebounce_controller<string>(async (value) => {
      saved.push(value);
    }, clock.timers);
    "hello".split("").forEach((_, i) => saver.type("hello".slice(0, i + 1)));
    expect(saved).to.eql([]);
    clock.fire();
    await settle();
    expect(saved).to.eql(["hello"]);
  });

  it("two failed saves show one alert: typing after a failure does not save again", async () => {
    const attempts: string[] = [];
    const clock = fakeTimers();
    const saver = SaveDebounce_controller<string>((value) => {
      attempts.push(value);
      return Promise.reject(new Error("disk full"));
    }, clock.timers);
    saver.type("a");
    clock.fire();
    await settle();
    "abcdefghijklmnopqrst".split("").forEach((_, i) => saver.type("abcdefghijklmnopqrst".slice(0, i + 1)));
    expect(clock.isArmed()).to.equal(false);
    expect(attempts).to.eql(["a"]);
  });

  it("saves the pending text on flush after a failure", async () => {
    const attempts: string[] = [];
    const clock = fakeTimers();
    let isFull = true;
    const saver = SaveDebounce_controller<string>((value) => {
      attempts.push(value);
      return isFull ? Promise.reject(new Error("disk full")) : Promise.resolve();
    }, clock.timers);
    saver.type("a");
    clock.fire();
    await settle();
    saver.type("ab");
    isFull = false;
    saver.flush();
    await settle();
    expect(attempts).to.eql(["a", "ab"]);
  });

  it("saves the pending text when the editor closes before the timer", async () => {
    const saved: string[] = [];
    const clock = fakeTimers();
    const saver = SaveDebounce_controller<string>(async (value) => {
      saved.push(value);
    }, clock.timers);
    saver.type("note");
    saver.flush();
    await settle();
    expect(saved).to.eql(["note"]);
    expect(clock.isArmed()).to.equal(false);
  });

  it("drops the pending text after a discard", async () => {
    const saved: string[] = [];
    const clock = fakeTimers();
    const saver = SaveDebounce_controller<string>(async (value) => {
      saved.push(value);
    }, clock.timers);
    saver.type("note");
    saver.discard();
    saver.flush();
    await settle();
    expect(saved).to.eql([]);
  });
});
