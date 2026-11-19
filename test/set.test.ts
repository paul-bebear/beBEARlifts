import "mocha";
import { expect } from "chai";
import { Reps_isCompletedSet, Reps_isInRangeCompletedSet, Reps_setsStatus } from "../src/models/set";
import { ISet } from "../src/types";
import { Weight_build } from "../src/models/weight";

function done(overrides: Partial<ISet>): ISet {
  return { vtype: "set", id: "s", index: 0, isUnilateral: false, isCompleted: true, ...overrides };
}

function kg(reps: number, weight: number, doneReps: number, doneWeight: number): ISet {
  return done({
    reps,
    weight: Weight_build(weight, "kg"),
    completedReps: doneReps,
    completedWeight: Weight_build(doneWeight, "kg"),
  });
}

describe("Reps_isCompletedSet", () => {
  it("counts more weight with fewer reps as a success when the weight moved is higher", () => {
    expect(Reps_isCompletedSet(kg(11, 40, 10, 52))).to.equal(true);
    expect(Reps_isCompletedSet(kg(11, 10, 8, 18))).to.equal(true);
    expect(Reps_isCompletedSet(kg(11, 12.5, 10, 20))).to.equal(true);
    expect(Reps_isCompletedSet(kg(8, 51, 6, 70))).to.equal(true);
  });

  it("fails a set that moved less weight in total", () => {
    expect(Reps_isCompletedSet(kg(8, 51, 8, 50))).to.equal(false);
  });

  it("keeps the old result when the target is met exactly or beaten on both counts", () => {
    expect(Reps_isCompletedSet(kg(8, 50, 8, 50))).to.equal(true);
    expect(Reps_isCompletedSet(kg(8, 50, 9, 55))).to.equal(true);
  });

  it("is not a success until the set is checked off", () => {
    expect(Reps_isCompletedSet({ ...kg(8, 50, 8, 50), isCompleted: false })).to.equal(false);
  });

  it("is a failure without logged reps or weight", () => {
    expect(Reps_isCompletedSet(done({ reps: 8, weight: Weight_build(50, "kg") }))).to.equal(false);
  });

  it("keeps the per-field check when the target has no weight", () => {
    const base = { completedReps: 8, completedWeight: Weight_build(50, "kg") };
    expect(Reps_isCompletedSet(done({ ...base, reps: 8 }))).to.equal(true);
    expect(Reps_isCompletedSet(done({ ...base, reps: 9 }))).to.equal(false);
  });

  it("keeps the per-field check when the target has no reps", () => {
    const base = { completedReps: 8, completedWeight: Weight_build(50, "kg") };
    expect(Reps_isCompletedSet(done({ ...base, weight: Weight_build(50, "kg") }))).to.equal(true);
    expect(Reps_isCompletedSet(done({ ...base, weight: Weight_build(55, "kg") }))).to.equal(false);
  });

  it("adds left and right reps on both sides of a unilateral set", () => {
    const target = { isUnilateral: true, reps: 10, weight: Weight_build(20, "kg") };
    const weight = { completedWeight: Weight_build(20, "kg") };
    expect(Reps_isCompletedSet(done({ ...target, ...weight, completedReps: 10, completedRepsLeft: 10 }))).to.equal(
      true
    );
    expect(Reps_isCompletedSet(done({ ...target, ...weight, completedReps: 10, completedRepsLeft: 9 }))).to.equal(
      false
    );
    expect(Reps_isCompletedSet(done({ ...target, ...weight, completedReps: 10, completedRepsLeft: 11 }))).to.equal(
      true
    );
  });

  it("needs the target reps when the target or the logged weight is 0", () => {
    expect(Reps_isCompletedSet(kg(10, 0, 3, 0))).to.equal(false);
    expect(Reps_isCompletedSet(kg(10, 0, 10, 0))).to.equal(true);
    expect(Reps_isCompletedSet(kg(10, 0, 3, 20))).to.equal(false);
    expect(Reps_isCompletedSet(kg(10, 0, 10, 20))).to.equal(true);
    expect(Reps_isCompletedSet(kg(10, 20, 30, 0))).to.equal(false);
  });

  it("converts units before it compares", () => {
    const target = { reps: 5, weight: Weight_build(100, "kg") };
    const heavier = done({ ...target, completedReps: 5, completedWeight: Weight_build(230, "lb") });
    const lighter = done({ ...target, completedReps: 5, completedWeight: Weight_build(200, "lb") });
    expect(Reps_isCompletedSet(heavier)).to.equal(true);
    expect(Reps_isCompletedSet(lighter)).to.equal(false);
  });
});

describe("Reps_isInRangeCompletedSet", () => {
  const range = { minReps: 8, reps: 12, weight: Weight_build(40, "kg") };

  it("accepts a set inside the rep range with more weight", () => {
    const set = done({ ...range, completedReps: 8, completedWeight: Weight_build(45, "kg") });
    expect(Reps_isInRangeCompletedSet(set)).to.equal(true);
  });

  it("rejects a set whose weight moved falls under the minimum reps at the target weight", () => {
    const set = done({ ...range, completedReps: 7, completedWeight: Weight_build(45, "kg") });
    expect(Reps_isInRangeCompletedSet(set)).to.equal(false);
  });

  it("does not turn a set with heavier weight and the minimum reps red in the workout status", () => {
    const set = done({ ...range, completedReps: 8, completedWeight: Weight_build(45, "kg") });
    expect(Reps_setsStatus([set])).to.equal("in-range");
  });
});
