import "mocha";
import { expect } from "chai";
import type { IProgressMode } from "../src/types";
import type { IPlannerProgramExercise } from "../src/pages/planner/models/types";
import { IWorkoutSetType, WorkoutSetType_decide, WorkoutSetType_isAdhoc } from "../src/models/workoutSetType";

const programExercise = {} as IPlannerProgramExercise;

// Warm-up sets never pass the adhoc flag when added, but the isAdhoc rule alone says true for a current progress
// without a program exercise. The drawn type still wins with "warmup", so nothing differs on screen.
// Verbatim copies of the two rules as they stood in workoutExerciseSet.tsx and workoutExerciseAllSets.tsx.
function drawnTypeBefore(
  type: IProgressMode,
  isCurrentProgress: boolean,
  exercise: IPlannerProgramExercise | undefined
): IWorkoutSetType {
  return type === "warmup" ? "warmup" : isCurrentProgress && exercise == null ? "adhoc" : "program";
}

function addedAdhocBefore(isCurrentProgress: boolean, exercise: IPlannerProgramExercise | undefined): boolean {
  return isCurrentProgress && exercise == null;
}

const rows: [IProgressMode, boolean, IPlannerProgramExercise | undefined, IWorkoutSetType, boolean][] = [
  ["warmup", true, undefined, "warmup", true],
  ["warmup", true, programExercise, "warmup", false],
  ["warmup", false, undefined, "warmup", false],
  ["warmup", false, programExercise, "warmup", false],
  ["workout", true, undefined, "adhoc", true],
  ["workout", true, programExercise, "program", false],
  ["workout", false, undefined, "program", false],
  ["workout", false, programExercise, "program", false],
];

describe("WorkoutSetType", () => {
  rows.forEach(([mode, isCurrent, exercise, expectedType, expectedAdhoc]) => {
    const name = `${mode}, current=${isCurrent}, program exercise=${exercise != null}`;
    it(`decides the drawn type for ${name}`, () => {
      expect(WorkoutSetType_decide(mode, isCurrent, exercise)).to.equal(expectedType);
      expect(drawnTypeBefore(mode, isCurrent, exercise)).to.equal(expectedType);
    });
    it(`decides the adhoc flag for a new set for ${name}`, () => {
      expect(WorkoutSetType_isAdhoc(isCurrent, exercise)).to.equal(expectedAdhoc);
      expect(WorkoutSetType_isAdhoc(isCurrent, exercise)).to.equal(addedAdhocBefore(isCurrent, exercise));
    });
  });
});
