import "mocha";
import { expect } from "chai";
import { PlannerTestUtils_get } from "./utils/plannerTestUtils";
import { Program_nextHistoryRecord } from "../src/models/program";
import { Progress_changeAmrapAction, Progress_completeSet } from "../src/models/progress";
import { Settings_build } from "../src/models/settings";
import { Stats_getEmpty } from "../src/models/stats";
import { IHistoryRecord, ISet, ISettings } from "../src/types";
import {
  EffortRating_color,
  EffortRating_fromRpe,
  EffortRating_isEnabled,
  EffortRating_shouldAsk,
} from "../src/models/effortRating";
import { WorkoutExerciseUtils_getColor } from "../src/utils/workoutExerciseUtils";

const rating: ISettings = { ...Settings_build(), rateEachSet: true };

function buildProgress(text: string): IHistoryRecord {
  const { program } = PlannerTestUtils_get(text);
  return Program_nextHistoryRecord(program, Settings_build(), Stats_getEmpty(), 0);
}

function doneSet(reps: number, completedReps: number, completedRpe?: number, minReps?: number): ISet {
  const completedWeight = { value: 100, unit: "kg" as const };
  return { id: "s", index: 0, reps, minReps, completedReps, completedWeight, completedRpe, isCompleted: true } as ISet;
}

function rate(progress: IHistoryRecord, rpeValue: number | undefined, rateEffort: boolean): IHistoryRecord {
  return Progress_changeAmrapAction(
    [],
    rating,
    Stats_getEmpty(),
    progress,
    { type: "ChangeAMRAPAction", entryIndex: 0, setIndex: 0, isPlayground: false, rpeValue, rateEffort },
    undefined
  );
}

describe("Effort rating", () => {
  it("maps RPE back to the three buttons", () => {
    expect([6, 6.5, 7, 8, 9.5, 10].map(EffortRating_fromRpe)).to.deep.equal([
      "easy",
      "easy",
      "right",
      "right",
      "right",
      "hard",
    ]);
  });

  it("is off by default outside the offline build, and follows the setting", () => {
    expect(EffortRating_isEnabled(Settings_build())).to.equal(false);
    expect(EffortRating_isEnabled(rating)).to.equal(true);
  });

  it("does not ask on timed sets, program RPE sets or in the playground", () => {
    const set = { id: "s", reps: 5, isCompleted: false } as ISet;
    expect(EffortRating_shouldAsk(set, rating, false)).to.equal(true);
    expect(EffortRating_shouldAsk({ ...set, setTimer: 30 }, rating, false)).to.equal(false);
    expect(EffortRating_shouldAsk({ ...set, logRpe: true }, rating, false)).to.equal(false);
    expect(EffortRating_shouldAsk(set, rating, true)).to.equal(false);
  });

  it("colours just right green and both extremes yellow", () => {
    expect(WorkoutExerciseUtils_getColor([doneSet(5, 5, 8)], false)).to.equal("green");
    expect(WorkoutExerciseUtils_getColor([doneSet(5, 5, 6)], false)).to.equal("yellow");
    expect(WorkoutExerciseUtils_getColor([doneSet(5, 5, 10)], false)).to.equal("yellow");
    expect(WorkoutExerciseUtils_getColor([doneSet(5, 5)], false)).to.equal("green");
  });

  it("keeps missed minimum reps red whatever the rating", () => {
    expect(WorkoutExerciseUtils_getColor([doneSet(10, 6, 8, 8)], false)).to.equal("red");
  });

  it("makes an exercise yellow when any rated set was off", () => {
    expect(EffortRating_color([doneSet(5, 5, 8), doneSet(5, 5, 10)])).to.equal("yellow");
    expect(EffortRating_color([doneSet(5, 5, 8), doneSet(5, 5)])).to.equal("green");
  });

  it("opens the rating sheet on a set tap, then completes the set with the rating", () => {
    const progress = buildProgress(`# Week 1\n## Day 1\nSquat / 3x5 100lb\n`);
    const opened = Progress_completeSet(progress, 0, 0, "workout", false, rating);
    expect(opened.amrapModal?.rateEffort).to.equal(true);
    expect(opened.entries[0].sets[0].isCompleted).to.not.equal(true);

    const rated = rate(opened, 8, true);
    expect(rated.amrapModal).to.equal(undefined);
    expect(rated.entries[0].sets[0].isCompleted).to.equal(true);
    expect(rated.entries[0].sets[0].completedRpe).to.equal(8);
  });

  it("completes the set without a rating on Skip, and leaves it open on Cancel", () => {
    const opened = Progress_completeSet(
      buildProgress(`# Week 1\n## Day 1\nSquat / 3x5 100lb\n`),
      0,
      0,
      "workout",
      false,
      rating
    );
    const skipped = rate(opened, undefined, true);
    expect(skipped.entries[0].sets[0].isCompleted).to.equal(true);
    expect(skipped.entries[0].sets[0].completedRpe).to.equal(undefined);

    const cancelled = rate(opened, undefined, false);
    expect(cancelled.amrapModal).to.equal(undefined);
    expect(cancelled.entries[0].sets[0].isCompleted).to.not.equal(true);
  });

  it("completes the set in one tap when rating is off", () => {
    const progress = buildProgress(`# Week 1\n## Day 1\nSquat / 3x5 100lb\n`);
    const done = Progress_completeSet(progress, 0, 0, "workout", false, Settings_build());
    expect(done.amrapModal).to.equal(undefined);
    expect(done.entries[0].sets[0].isCompleted).to.equal(true);
  });
});
