import "mocha";
import { expect } from "chai";
import { PlannerProgram_evaluate, PlannerProgram_generateFullText } from "../src/pages/planner/models/plannerProgram";
import { Settings_build } from "../src/models/settings";
import {
  PlannerProgramExercise_buildProgress,
  PlannerProgramExercise_getProgressDefaultArgs,
} from "../src/pages/planner/models/plannerProgramExercise";
import { Weight_build } from "../src/models/weight";
import { PlannerTestUtils_finish, PlannerTestUtils_get } from "./utils/plannerTestUtils";
import { IWeight } from "../src/types";

function finishText(program: string, reps: number[], weights?: IWeight[]): string {
  const { program: finished } = PlannerTestUtils_finish(program, {
    completedReps: [reps],
    completedWeights: weights != null ? [weights] : undefined,
  });
  return PlannerProgram_generateFullText(finished.planner!.weeks).trim();
}

function plan(body: string): string {
  return `# Week 1\n## Day 1\n${body}`;
}

function evaluationError(body: string): string | undefined {
  const { planner } = PlannerTestUtils_get(plan(body));
  const day = PlannerProgram_evaluate(planner, Settings_build()).evaluatedWeeks[0][0];
  return day.success ? undefined : day.error.message;
}

describe("beat progression", () => {
  it("has default arguments of 5lb and a 12 rep ceiling", () => {
    expect(PlannerProgramExercise_getProgressDefaultArgs("beat")).to.eql(["5lb", "12"]);
  });

  it("puts the increment and the rep ceiling into state", () => {
    const result = PlannerProgramExercise_buildProgress("beat", ["2.5lb", "15"]);
    expect(result.success).to.equal(true);
    if (result.success) {
      expect(result.data.type).to.equal("beat");
      expect(result.data.state.increment).to.eql(Weight_build(2.5, "lb"));
      expect(result.data.state.maxReps).to.equal(15);
    }
  });

  it("parses beat(5lb, 12) from program text", () => {
    const { planner } = PlannerTestUtils_get(plan("Squat / 3x8 / 100lb / progress: beat(5lb, 12)"));
    const progress = planner.weeks[0].days[0].exerciseText;
    expect(progress).to.contain("progress: beat(5lb, 12)");
  });

  it("rejects beat with the wrong argument count", () => {
    expect(evaluationError("Squat / 3x8 / 100lb / progress: beat(5lb)")).to.contain(
      "Beat Progression 'beat' should have 2 arguments"
    );
  });

  it("rejects a beat increment that has no unit", () => {
    expect(evaluationError("Squat / 3x8 / 100lb / progress: beat(5, 12)")).to.contain("1st argument of 'beat'");
  });

  it("accepts beat(5lb, 12)", () => {
    expect(evaluationError("Squat / 3x8 / 100lb / progress: beat(5lb, 12)")).to.equal(undefined);
  });

  it("raises the target to a heavier set done for fewer reps", () => {
    const text = finishText(
      plan("Lat Pulldown / 1x11 / 40kg / progress: beat(5lb, 12)"),
      [10],
      [Weight_build(52, "kg")]
    );
    expect(text).to.contain("Lat Pulldown / 1x10 / 52kg / progress: beat(5lb, 12)");
  });

  it("raises the target to more reps at the same weight", () => {
    const text = finishText(plan("Squat / 1x8 / 100lb / progress: beat(5lb, 12)"), [10], [Weight_build(100, "lb")]);
    expect(text).to.contain("Squat / 1x10 / 100lb / progress: beat(5lb, 12)");
  });

  it("leaves the target when the set moved less weight", () => {
    const text = finishText(plan("Bench Press / 1x8 / 51kg / progress: beat(5lb, 12)"), [8], [Weight_build(50, "kg")]);
    expect(text).to.contain("Bench Press / 1x8 / 51kg / progress: beat(5lb, 12)");
  });

  it("leaves the target when the set missed on reps and on weight", () => {
    const text = finishText(plan("Squat / 1x8 / 100lb / progress: beat(5lb, 12)"), [5], [Weight_build(90, "lb")]);
    expect(text).to.contain("Squat / 1x8 / 100lb / progress: beat(5lb, 12)");
  });

  it("never lowers a target on a failed set", () => {
    const text = finishText(plan("Squat / 1x8 / 100lb / progress: beat(5lb, 12)"), [1], [Weight_build(100, "lb")]);
    expect(text).to.contain("Squat / 1x8 / 100lb / progress: beat(5lb, 12)");
  });

  it("copies the logged weight when the program has no weight yet", () => {
    const text = finishText(plan("Squat / 1x8 / progress: beat(5lb, 12)"), [8], [Weight_build(60, "lb")]);
    expect(text).to.contain("Squat / 1x8 / 60lb / progress: beat(5lb, 12)");
  });

  it("raises reps and weight together on a first workout that beat the planned reps", () => {
    const text = finishText(plan("Squat / 1x8 / 0lb / progress: beat(5lb, 12)"), [10], [Weight_build(60, "lb")]);
    expect(text).to.contain("Squat / 1x10 / 60lb / progress: beat(5lb, 12)");
  });

  it("turns reps past the ceiling into weight", () => {
    const text = finishText(plan("Bicep Curl / 1x8 / 20lb / progress: beat(5lb, 12)"), [20], [Weight_build(30, "lb")]);
    expect(text).to.contain("Bicep Curl / 1x12 / 35lb / progress: beat(5lb, 12)");
  });

  it("does not turn reps past the ceiling into a smaller target", () => {
    const text = finishText(plan("Squat / 1x8 / 100lb / progress: beat(5lb, 12)"), [20], [Weight_build(60, "lb")]);
    expect(text).to.contain("Squat / 1x8 / 100lb / progress: beat(5lb, 12)");
  });

  it("keeps a set at the ceiling as reps while it does not pass the ceiling", () => {
    const text = finishText(plan("Bicep Curl / 1x8 / 20lb / progress: beat(5lb, 12)"), [12], [Weight_build(30, "lb")]);
    expect(text).to.contain("Bicep Curl / 1x12 / 30lb / progress: beat(5lb, 12)");
  });

  it("compares a logged weight in kg against a target in lb", () => {
    const text = finishText(plan("Squat / 1x8 / 100lb / progress: beat(5lb, 12)"), [8], [Weight_build(50, "kg")]);
    expect(text).to.contain("Squat / 1x8 / 50kg / progress: beat(5lb, 12)");
  });

  it("keeps a lb target that a lighter kg set did not beat", () => {
    const text = finishText(plan("Squat / 1x8 / 100lb / progress: beat(5lb, 12)"), [8], [Weight_build(40, "kg")]);
    expect(text).to.contain("Squat / 1x8 / 100lb / progress: beat(5lb, 12)");
  });

  it("ratchets each set on its own", () => {
    const text = finishText(
      plan("Bench Press / 1x10 40lb, 1x10 50lb, 1x8 60lb / progress: beat(5lb, 12)"),
      [10, 10, 8],
      [Weight_build(40, "lb"), Weight_build(55, "lb"), Weight_build(55, "lb")]
    );
    expect(text).to.contain("Bench Press / 1x10 40lb, 1x10 55lb, 1x8 60lb / progress: beat(5lb, 12)");
  });
});
