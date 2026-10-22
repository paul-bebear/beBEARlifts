import "mocha";
import { expect } from "chai";
import {
  FirstUseTips_next,
  FirstUseTips_transition,
  FirstUseTips_workoutEvent,
  FirstUseTips_hasCrossedWeight,
  FirstUseTips_recordSeen,
  IFirstUseEvent,
} from "../src/models/firstUseTips";
import { ISet } from "../src/types";

describe("FirstUseTips", () => {
  it("shows each tip once and records it in helps", () => {
    const first = FirstUseTips_next("setTap", ["other"]);
    expect(first.tip?.text).to.equal(
      "Tap the circle when a set is done. Change the numbers first if you did something else."
    );
    expect(first.helps).to.deep.equal(["other", first.tip?.id]);
    const second = FirstUseTips_next("setTap", first.helps);
    expect(second.tip).to.equal(undefined);
    expect(second.helps).to.equal(first.helps);
  });
  it("keeps the four tips apart, one sentence each", () => {
    const events: IFirstUseEvent[] = ["setTap", "crossedWeight", "finishTap", "programEditorOpen"];
    let helps: string[] = [];
    for (const event of events) {
      const next = FirstUseTips_next(event, helps);
      expect(next.tip, event).not.to.equal(undefined);
      helps = next.helps;
    }
    expect(new Set(helps).size).to.equal(4);
    expect(FirstUseTips_next("finishTap", []).tip?.text).to.equal("Finish saves the workout and grows your bear.");
  });

  it("keeps the current tip when an already seen event repeats", () => {
    const first = FirstUseTips_transition({ helps: [] }, "setTap", []);
    const next = FirstUseTips_transition(first.state, "setTap", first.state.helps);
    expect(next.state.tip).to.equal(first.state.tip);
    expect(next.shownId).to.equal(undefined);
  });

  it("replaces the set tip with Finish after completing a set", () => {
    const first = FirstUseTips_transition({ helps: [] }, "setTap", []);
    const next = FirstUseTips_transition(first.state, "finishTap", []);
    expect(next.state.tip?.id).to.equal("tip-finish-tap");
    expect(next.shownId).to.equal("tip-finish-tap");
    expect(next.state.helps).to.deep.equal(["tip-set-tap", "tip-finish-tap"]);
  });

  it("waits until the instruction closes before showing the crossed weight tip", () => {
    const first = FirstUseTips_transition({ helps: [] }, "setTap", []);
    const crossed = FirstUseTips_transition(first.state, "crossedWeight", []);
    expect(crossed.state.tip).to.equal(first.state.tip);
    expect(crossed.shownId).to.equal(undefined);
    expect(crossed.state.helps).not.to.include("tip-crossed-weight");
    const closed = FirstUseTips_transition(crossed.state, "close", []);
    const shown = FirstUseTips_transition(closed.state, "crossedWeight", []);
    expect(shown.state.tip?.id).to.equal("tip-crossed-weight");
    expect(shown.shownId).to.equal("tip-crossed-weight");
  });

  it("replaces the crossed weight tip when the first set completes", () => {
    const first = FirstUseTips_transition({ helps: [] }, "crossedWeight", []);
    const next = FirstUseTips_transition(first.state, "finishTap", []);
    expect(next.state.tip?.id).to.equal("tip-finish-tap");
  });

  it("closes a tip without showing it again", () => {
    const first = FirstUseTips_transition({ helps: [] }, "setTap", []);
    const closed = FirstUseTips_transition(first.state, "close", []);
    expect(closed.state.tip).to.equal(undefined);
    expect(FirstUseTips_transition(closed.state, "setTap", []).state.tip).to.equal(undefined);
  });

  it("does not repeat tips after restoring the seen ids", () => {
    const events: IFirstUseEvent[] = ["setTap", "finishTap", "crossedWeight", "programEditorOpen"];
    const helps = events.map((event) => FirstUseTips_next(event, []).tip!.id);
    for (const event of events) {
      const restored = FirstUseTips_transition({ helps: [] }, event, helps);
      expect(restored.state.tip, event).to.equal(undefined);
      expect(restored.shownId, event).to.equal(undefined);
    }
  });

  it("merges new helps without losing tips reported before storage updates", () => {
    const first = FirstUseTips_transition({ helps: ["existing"] }, "setTap", ["existing"]);
    const next = FirstUseTips_transition(first.state, "finishTap", ["existing", "another"]);
    expect(next.state.helps).to.deep.equal(["existing", "another", "tip-set-tap", "tip-finish-tap"]);
  });

  it("records a seen tip without replacing unrelated helps or adding duplicates", () => {
    const helps = ["existing", "tip-set-tap"];
    expect(FirstUseTips_recordSeen(helps, "tip-set-tap")).to.equal(helps);
    expect(FirstUseTips_recordSeen(helps, "tip-finish-tap")).to.deep.equal([...helps, "tip-finish-tap"]);
  });

  it("reports the set instruction for an unfinished workout", () => {
    expect(FirstUseTips_workoutEvent(0, [{ sets: [{}], warmupSets: [] }])).to.equal("setTap");
  });

  it("reports Finish for a completed work set or warmup", () => {
    expect(FirstUseTips_workoutEvent(0, [{ sets: [{ isCompleted: true }], warmupSets: [] }])).to.equal("finishTap");
    expect(FirstUseTips_workoutEvent(0, [{ sets: [{}], warmupSets: [{ isCompleted: true }] }])).to.equal("finishTap");
  });

  it("does not report workout tips for history records or an empty workout", () => {
    expect(FirstUseTips_workoutEvent(123, [{ sets: [{}], warmupSets: [] }])).to.equal(undefined);
    expect(FirstUseTips_workoutEvent(0, [])).to.equal(undefined);
    expect(FirstUseTips_workoutEvent(0, [{ sets: [], warmupSets: [] }])).to.equal(undefined);
  });

  it("reports crossed weights for program and ad-hoc targets", () => {
    const set: Pick<ISet, "weight" | "originalWeight"> = {
      weight: { value: 20, unit: "kg" },
      originalWeight: { value: 21, unit: "kg" },
    };
    expect(FirstUseTips_hasCrossedWeight(set, "program")).to.equal(true);
    expect(FirstUseTips_hasCrossedWeight(set, "adhoc")).to.equal(true);
    expect(FirstUseTips_hasCrossedWeight(set, "warmup")).to.equal(false);
  });

  it("does not report crossed weights when either weight is absent or both match", () => {
    const weight = { value: 20, unit: "kg" as const };
    expect(FirstUseTips_hasCrossedWeight({}, "program")).to.equal(false);
    expect(FirstUseTips_hasCrossedWeight({ weight }, "program")).to.equal(false);
    expect(FirstUseTips_hasCrossedWeight({ originalWeight: weight }, "program")).to.equal(false);
    expect(FirstUseTips_hasCrossedWeight({ weight, originalWeight: { ...weight } }, "program")).to.equal(false);
  });
});
