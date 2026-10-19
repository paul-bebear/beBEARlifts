import "mocha";
import { expect } from "chai";
import { Reps_addSet, Reps_setsStatus } from "../src/models/set";
import { ISet } from "../src/types";
import { Weight_build } from "../src/models/weight";

function set(overrides: Partial<ISet>): ISet {
  return { vtype: "set", id: "prev", index: 0, isUnilateral: false, reps: 5, isCompleted: true, ...overrides };
}

describe("Reps_addSet", () => {
  it("converts a set copied from the previous workout to the equipment unit", () => {
    const previous = set({
      weight: Weight_build(45, "lb"),
      originalWeight: Weight_build(0, "lb"),
      completedWeight: Weight_build(70, "lb"),
    });
    const added = Reps_addSet([], false, previous, false, "kg");
    expect(added[0].weight).to.deep.equal(Weight_build(20.5, "kg"));
    expect(added[0].originalWeight).to.deep.equal(Weight_build(0, "kg"));
    expect(added[0].completedWeight).to.equal(undefined);
  });

  it("gives an ad-hoc set the last numbers as pre-filled values, not as a target", () => {
    const done = set({
      reps: 12,
      weight: Weight_build(12, "kg"),
      completedReps: 12,
      completedWeight: Weight_build(12, "kg"),
    });
    const added = Reps_addSet([done], false, undefined, false, "kg", true)[1];
    expect(added).to.deep.include({ reps: undefined, weight: undefined, isCompleted: false, completedReps: 12 });
    expect(added.completedWeight).to.deep.equal(Weight_build(12, "kg"));
  });

  it("marks a finished ad-hoc set with fewer reps as a success", () => {
    const done = set({
      reps: 12,
      weight: Weight_build(12, "kg"),
      completedReps: 12,
      completedWeight: Weight_build(12, "kg"),
    });
    const added = Reps_addSet([done], false, undefined, false, "kg", true)[1];
    expect(Reps_setsStatus([{ ...added, completedReps: 9, isCompleted: true }])).to.equal("success");
  });

  it("pre-fills both sides of a unilateral ad-hoc set", () => {
    const done = set({
      isUnilateral: true,
      completedReps: 12,
      completedRepsLeft: 11,
      completedWeight: Weight_build(12, "kg"),
    });
    const added = Reps_addSet([done], true, undefined, false, "kg", true)[1];
    expect(added.completedReps).to.equal(12);
    expect(added.completedRepsLeft).to.equal(11);
  });

  it("keeps the last set as the target of an added program set", () => {
    const done = set({
      reps: 12,
      weight: Weight_build(12, "kg"),
      completedReps: 12,
      completedWeight: Weight_build(12, "kg"),
    });
    const added = Reps_addSet([done], false, undefined, false, "kg")[1];
    expect(added.reps).to.equal(12);
    expect(
      Reps_setsStatus([{ ...added, completedReps: 9, completedWeight: Weight_build(12, "kg"), isCompleted: true }])
    ).to.equal("failed");
  });

  it("keeps the unit of a set copied from the same workout", () => {
    const current = set({ weight: Weight_build(45, "lb") });
    const added = Reps_addSet([current], false, undefined, false, "kg");
    expect(added[1].weight).to.deep.equal(Weight_build(45, "lb"));
  });
});
