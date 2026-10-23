import "mocha";
import { expect } from "chai";
import {
  WorkoutSupersetPair_isPaired,
  WorkoutSupersetPair_join,
  WorkoutSupersetPair_newName,
} from "../src/models/workoutSupersetPair";
import { IHistoryEntry } from "../src/types";

function entry(id: string, superset?: string): IHistoryEntry {
  return {
    vtype: "history_entry",
    id,
    index: 0,
    exercise: { id: "bench" },
    sets: [],
    warmupSets: [],
    superset,
  } as unknown as IHistoryEntry;
}

const groups = (entries: IHistoryEntry[]): (string | undefined)[] => entries.map((e) => e.superset);

describe("WorkoutSupersetPair", () => {
  it("puts two lone exercises into a new group named by the first free letter", () => {
    const entries = [entry("a"), entry("b"), entry("c", "A")];
    expect(groups(WorkoutSupersetPair_join(entries, "a", "b"))).to.deep.equal(["B", "B", "A"]);
  });

  it("joins the partner's group, else keeps the entry's own group", () => {
    const entries = [entry("a"), entry("b", "A"), entry("c", "legs")];
    expect(groups(WorkoutSupersetPair_join(entries, "a", "b"))).to.deep.equal(["A", "A", "legs"]);
    expect(groups(WorkoutSupersetPair_join(entries, "c", "a"))).to.deep.equal(["legs", "A", "legs"]);
  });

  it("returns the same list when nothing changes or an id is unknown", () => {
    const entries = [entry("a", "A"), entry("b", "A")];
    expect(WorkoutSupersetPair_join(entries, "a", "b")).to.equal(entries);
    expect(WorkoutSupersetPair_join(entries, "a", "a")).to.equal(entries);
    expect(WorkoutSupersetPair_join(entries, "a", "x")).to.equal(entries);
  });

  it("names a group after Z with a number", () => {
    const all = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").map((l, i) => entry(`${i}`, l));
    expect(WorkoutSupersetPair_newName(all)).to.equal("Superset 1");
    expect(WorkoutSupersetPair_newName([...all, entry("x", "Superset 1")])).to.equal("Superset 2");
  });

  it("calls two exercises paired only when they share a group", () => {
    expect(WorkoutSupersetPair_isPaired(entry("a", "A"), entry("b", "A"))).to.equal(true);
    expect(WorkoutSupersetPair_isPaired(entry("a"), entry("b"))).to.equal(false);
  });
});
