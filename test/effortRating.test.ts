import "mocha";
import { expect } from "chai";
import { PlannerTestUtils_get } from "./utils/plannerTestUtils";
import { Program_nextHistoryRecord } from "../src/models/program";
import { Progress_completeSetAction } from "../src/models/progress";
import { Settings_build } from "../src/models/settings";
import { Stats_getEmpty } from "../src/models/stats";
import { History_getMax1RMSet } from "../src/models/history";
import { Reps_setToDisplaySet } from "../src/models/set";
import { migrations } from "../src/migrations/migrations";
import { IEffort, IHistoryRecord, ISet, ISettings, IStorage } from "../src/types";
import {
  EffortRating_color,
  EffortRating_isEnabled,
  EffortRating_moveLegacyRating,
  EffortRating_rate,
  EffortRating_stripSetIndex,
} from "../src/models/effortRating";
import { WorkoutExerciseUtils_getColor } from "../src/utils/workoutExerciseUtils";

const rating: ISettings = { ...Settings_build(), rateEachSet: true };
const afterRatingShipped = Date.UTC(2026, 9, 21, 18);
const beforeRatingShipped = Date.UTC(2026, 8, 1, 18);

function buildProgress(text: string): IHistoryRecord {
  const { program } = PlannerTestUtils_get(text);
  return Program_nextHistoryRecord(program, Settings_build(), Stats_getEmpty(), 0);
}

function doneSet(reps: number, completedReps: number, completedEffort?: IEffort, minReps?: number): ISet {
  const completedWeight = { value: 100, unit: "kg" as const };
  return {
    id: "s",
    index: 0,
    reps,
    minReps,
    completedReps,
    completedWeight,
    completedEffort,
    isCompleted: true,
  } as ISet;
}

function ticked(timestamp: number, extra: Partial<ISet> = {}): ISet {
  return { ...doneSet(5, 5), timestamp, ...extra };
}

function completeSet(progress: IHistoryRecord, isExternal: boolean): IHistoryRecord {
  return Progress_completeSetAction(
    [],
    rating,
    Stats_getEmpty(),
    progress,
    {
      type: "CompleteSetAction",
      entryIndex: 0,
      setIndex: 0,
      mode: "workout",
      forceUpdateEntryIndex: false,
      isExternal,
      isPlayground: false,
    },
    undefined
  );
}

describe("Effort rating", () => {
  it("is off by default outside the offline build, and follows the setting", () => {
    expect(EffortRating_isEnabled(Settings_build())).to.equal(false);
    expect(EffortRating_isEnabled(rating)).to.equal(true);
  });

  it("colours just right green and both extremes yellow", () => {
    expect(WorkoutExerciseUtils_getColor([doneSet(5, 5, "right")], false)).to.equal("green");
    expect(WorkoutExerciseUtils_getColor([doneSet(5, 5, "easy")], false)).to.equal("yellow");
    expect(WorkoutExerciseUtils_getColor([doneSet(5, 5, "hard")], false)).to.equal("yellow");
    expect(WorkoutExerciseUtils_getColor([doneSet(5, 5)], false)).to.equal("green");
  });

  it("keeps missed minimum reps red whatever the rating", () => {
    expect(WorkoutExerciseUtils_getColor([doneSet(10, 6, "right", 8)], false)).to.equal("red");
  });

  it("makes an exercise yellow when any rated set was off", () => {
    expect(EffortRating_color([doneSet(5, 5, "right"), doneSet(5, 5, "hard")])).to.equal("yellow");
    expect(EffortRating_color([doneSet(5, 5, "right"), doneSet(5, 5)])).to.equal("green");
  });

  it("asks about the most recently ticked set, not the last one in the list", () => {
    const sets = [ticked(3000), ticked(1000), { ...doneSet(5, 5), isCompleted: false }];
    expect(EffortRating_stripSetIndex(sets, rating, true, false)).to.equal(0);
  });

  it("shows no strip for timed sets, program RPE sets, the playground, history edits or with rating off", () => {
    const sets = [ticked(1000)];
    expect(EffortRating_stripSetIndex([ticked(1000, { setTimer: 30 })], rating, true, false)).to.equal(undefined);
    expect(EffortRating_stripSetIndex([ticked(1000, { logRpe: true })], rating, true, false)).to.equal(undefined);
    expect(EffortRating_stripSetIndex(sets, rating, true, true)).to.equal(undefined);
    expect(EffortRating_stripSetIndex(sets, rating, false, false)).to.equal(undefined);
    expect(EffortRating_stripSetIndex(sets, Settings_build(), true, false)).to.equal(undefined);
    expect(EffortRating_stripSetIndex([], rating, true, false)).to.equal(undefined);
  });

  it("offers the strip for AMRAP and one-side-at-a-time sets, and keeps their reps", () => {
    const amrap = ticked(1000, { isAmrap: true, completedReps: 12 });
    const unilateral = ticked(2000, { isUnilateral: true, completedReps: 5, completedRepsLeft: 4 });
    expect(EffortRating_stripSetIndex([amrap], rating, true, false)).to.equal(0);
    expect(EffortRating_stripSetIndex([amrap, unilateral], rating, true, false)).to.equal(1);
    const rated = EffortRating_rate(unilateral, "hard");
    expect(rated).to.deep.include({ completedReps: 5, completedRepsLeft: 4, completedEffort: "hard" });
    expect(EffortRating_rate(amrap, "easy")).to.deep.include({ completedReps: 12, completedEffort: "easy" });
  });

  it("stores the rating in its own field and clears it on a second tap", () => {
    const rated = EffortRating_rate(doneSet(5, 5), "right");
    expect(rated.completedEffort).to.equal("right");
    expect(rated.completedRpe).to.equal(undefined);
    expect(EffortRating_rate(rated, "hard").completedEffort).to.equal("hard");
    expect(EffortRating_rate(rated, "right").completedEffort).to.equal(undefined);
  });

  it("leaves the estimated 1RM and the PR set alone", () => {
    const unrated = doneSet(5, 5);
    for (const effort of ["easy", "right", "hard"] as const) {
      expect(History_getMax1RMSet([unrated, EffortRating_rate(unrated, effort)])).to.equal(unrated);
    }
  });

  it("does not paint a logged RPE red when the program set has no RPE target", () => {
    const set = { ...doneSet(5, 5), completedRpe: 8 };
    expect(Reps_setToDisplaySet(set, false, "kg").isRpeFailed).to.equal(false);
    expect(Reps_setToDisplaySet({ ...set, rpe: 7 }, false, "kg").isRpeFailed).to.equal(true);
    expect(Reps_setToDisplaySet({ ...set, rpe: 9 }, false, "kg").isRpeFailed).to.equal(false);
  });

  it("completes a set in one tap with rating on, and starts the rest timer at the tick", () => {
    const progress = buildProgress(`# Week 1\n## Day 1\nSquat / 3x5 100lb / 60s\n`);
    const before = Date.now();
    const done = completeSet(progress, false);
    expect(done.amrapModal).to.equal(undefined);
    expect(done.entries[0].sets[0].isCompleted).to.equal(true);
    expect(done.timerSince).to.be.at.least(before);
    expect(done.timerSince).to.be.at.most(Date.now());
  });

  it("completes a set ticked on the Apple Watch with rating on", () => {
    const done = completeSet(buildProgress(`# Week 1\n## Day 1\nSquat / 3x5 100lb\n`), true);
    expect(done.amrapModal).to.equal(undefined);
    expect(done.entries[0].sets[0].isCompleted).to.equal(true);
  });

  it("moves old ratings from completedRpe into completedEffort", () => {
    const legacy = (completedRpe: number, extra: Partial<ISet> = {}): ISet => ({
      ...doneSet(5, 5),
      completedRpe,
      ...extra,
    });
    expect(EffortRating_moveLegacyRating(legacy(6), afterRatingShipped)).to.include({ completedEffort: "easy" });
    expect(EffortRating_moveLegacyRating(legacy(8), afterRatingShipped)).to.include({ completedEffort: "right" });
    const hard = EffortRating_moveLegacyRating(legacy(10), afterRatingShipped);
    expect(hard.completedEffort).to.equal("hard");
    expect(hard.completedRpe).to.equal(undefined);
  });

  it("keeps real RPE: logged by the program, not 6, 8 or 10, or from before the rating shipped", () => {
    const set = { ...doneSet(5, 5), completedRpe: 8 };
    expect(EffortRating_moveLegacyRating({ ...set, logRpe: true }, afterRatingShipped).completedRpe).to.equal(8);
    expect(EffortRating_moveLegacyRating({ ...set, completedRpe: 7.5 }, afterRatingShipped).completedRpe).to.equal(7.5);
    expect(EffortRating_moveLegacyRating(set, beforeRatingShipped).completedRpe).to.equal(8);
  });

  it("migrates history and the running workout, and drops an open rating-only sheet", () => {
    const record = (id: number, startTime: number): IHistoryRecord =>
      ({
        id,
        startTime,
        entries: [{ sets: [{ ...doneSet(5, 5), completedRpe: 8 }], warmupSets: [] }],
      }) as unknown as IHistoryRecord;
    const running = {
      ...record(0, afterRatingShipped),
      amrapModal: { entryIndex: 0, setIndex: 1, rateEffort: true },
    } as IHistoryRecord;
    const storage = { history: [record(1, afterRatingShipped)], progress: [running] } as unknown as IStorage;

    const migrated = migrations["20261021120000_move_effort_rating_out_of_rpe"](storage);

    expect(migrated.history[0].entries[0].sets[0]).to.include({ completedEffort: "right" });
    expect(migrated.history[0].entries[0].sets[0].completedRpe).to.equal(undefined);
    expect(migrated.progress?.[0].entries[0].sets[0]).to.include({ completedEffort: "right" });
    expect(migrated.progress?.[0].amrapModal).to.equal(undefined);
  });
});
