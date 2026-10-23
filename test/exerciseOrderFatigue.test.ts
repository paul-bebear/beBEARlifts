import "mocha";
import { expect } from "chai";
import {
  ExerciseOrderFatigue_lastBefore,
  ExerciseOrderFatigue_notes,
  IOrderFatigueLookup,
} from "../src/models/exerciseOrderFatigue";
import { IHistoryEntry, IHistoryRecord, ISet } from "../src/types";

const muscles: Record<string, string[]> = {
  bench: ["chest", "triceps"],
  fly: ["chest"],
  incline: ["chest", "shoulders"],
  row: ["back"],
};

const lookup: IOrderFatigueLookup = {
  key: (e) => e.id,
  muscles: (e) => muscles[e.id] ?? [],
  name: (e) => ({ bench: "Bench Press", fly: "Chest Fly", incline: "Incline Bench", row: "Row" })[e.id] ?? e.id,
};

function set(done: boolean, timestamp?: number): ISet {
  return {
    vtype: "set",
    index: 0,
    id: "s",
    reps: 10,
    isCompleted: done,
    completedReps: done ? 10 : undefined,
    timestamp,
  } as ISet;
}

function entry(id: string, sets: ISet[]): IHistoryEntry {
  return {
    vtype: "history_entry",
    id: `e-${id}`,
    index: 0,
    exercise: { id: id as "bench" },
    sets,
    warmupSets: [],
  } as unknown as IHistoryEntry;
}

function record(startTime: number, entries: IHistoryEntry[]): IHistoryRecord {
  return { startTime, entries } as IHistoryRecord;
}

const keys = new Set(["bench", "fly", "incline", "row"]);

describe("ExerciseOrderFatigue", () => {
  const lastPush = record(1000, [
    entry("incline", [set(true, 1100), set(true, 1200)]),
    entry("bench", [set(true, 1300)]),
    entry("fly", [set(true, 1400)]),
  ]);

  it("counts the same-muscle lifts done before each exercise last time", () => {
    expect(ExerciseOrderFatigue_lastBefore([lastPush], 5000, keys, lookup)).to.deep.equal({
      incline: 0,
      bench: 1,
      fly: 2,
    });
  });

  it("takes the latest earlier workout and skips today's own record", () => {
    const older = record(500, [entry("fly", [set(true, 510)]), entry("incline", [set(true, 520)])]);
    const today = record(5000, [entry("bench", [set(true, 5100)]), entry("incline", [set(true, 5200)])]);
    expect(ExerciseOrderFatigue_lastBefore([older, today, lastPush], 5000, keys, lookup).incline).to.equal(0);
  });

  it("explains fewer reps when a lift done fresh last time now comes after chest work", () => {
    const lastBefore = ExerciseOrderFatigue_lastBefore([lastPush], 5000, keys, lookup);
    const today = [
      entry("incline", [set(false), set(false)]),
      entry("bench", [set(true, 5100)]),
      entry("fly", [set(true, 5200)]),
    ];
    expect(ExerciseOrderFatigue_notes(today, lastBefore, lookup)).to.deep.equal({
      "e-incline":
        "Bench Press and Chest Fly came first today. Last time you did this lift fresh, so a few reps fewer is normal.",
    });
  });

  it("says nothing when the order matches last time, other muscles came first, or the lift is done", () => {
    const lastBefore = ExerciseOrderFatigue_lastBefore([lastPush], 5000, keys, lookup);
    const sameOrder = [entry("incline", [set(false)]), entry("bench", [set(false)])];
    expect(ExerciseOrderFatigue_notes(sameOrder, lastBefore, lookup)).to.deep.equal({});
    const rowFirst = [entry("row", [set(true, 5100)]), entry("incline", [set(false)])];
    expect(ExerciseOrderFatigue_notes(rowFirst, { ...lastBefore, row: 0 }, lookup)).to.deep.equal({});
    const finished = [entry("bench", [set(true, 5100)]), entry("incline", [set(true, 5200)])];
    expect(ExerciseOrderFatigue_notes(finished, lastBefore, lookup)).to.deep.equal({});
  });

  it("keeps the note while the lift is half done, counting only lifts started before it", () => {
    const lastBefore = { bench: 0, incline: 1, fly: 2 };
    const today = [
      entry("bench", [set(true, 5100)]),
      entry("fly", [set(true, 5200)]),
      entry("incline", [set(true, 5300), set(false)]),
    ];
    expect(ExerciseOrderFatigue_notes(today, lastBefore, lookup)["e-incline"]).to.equal(
      "Bench Press and Chest Fly came first today. Last time only 1 lift for these muscles came before it, so a few reps fewer is normal."
    );
  });

  it("falls back to list order when sets have no timestamps", () => {
    const today = [entry("bench", [set(true)]), entry("incline", [set(false)])];
    expect(Object.keys(ExerciseOrderFatigue_notes(today, { incline: 0 }, lookup))).to.deep.equal(["e-incline"]);
  });
});
