import "mocha";
import { expect } from "chai";
import { LiftEquivalents_count, LiftEquivalents_pick } from "../src/models/liftEquivalents";
import {
  WorkoutStoryCard_duration,
  WorkoutStoryCard_muscles,
  WorkoutStoryCard_stats,
} from "../src/models/workoutStoryCard";
import { Settings_build } from "../src/models/settings";
import { Weight_build } from "../src/models/weight";
import { IHistoryRecord, ISet } from "../src/types";

const settings = { ...Settings_build(), units: "kg" as const };

function set(reps: number, kg: number, isCompleted: boolean = true): ISet {
  return {
    vtype: "set",
    id: `${reps}${kg}`,
    index: 0,
    completedReps: reps,
    completedWeight: Weight_build(kg, "kg"),
    isCompleted,
  };
}

const record = {
  vtype: "history_record",
  date: "2026-10-19T16:00:00.000Z",
  programId: "adhoc",
  programName: "Ad-Hoc",
  day: 1,
  dayName: "Ad-Hoc",
  id: 1,
  startTime: 0,
  endTime: 62 * 60 * 1000,
  entries: [
    {
      vtype: "history_entry",
      id: "bench",
      index: 0,
      exercise: { id: "benchPress", equipment: "barbell" },
      warmupSets: [],
      sets: [set(10, 60), set(8, 60), set(5, 80, false)],
    },
    {
      vtype: "history_entry",
      id: "squat",
      index: 1,
      exercise: { id: "squat", equipment: "barbell" },
      warmupSets: [],
      sets: [set(5, 100)],
    },
  ],
} as IHistoryRecord;

describe("WorkoutStoryCard", () => {
  it("formats the duration in hours and minutes", () => {
    expect([47 * 60000, 62 * 60000, 0].map(WorkoutStoryCard_duration)).to.deep.equal(["47m", "1h 2m", "0m"]);
  });

  it("totals time and finished sets, and uses the app's own volume, which counts entered reps", () => {
    const stats = WorkoutStoryCard_stats(record, settings);
    expect(stats).to.deep.include({ duration: "1h 2m", sets: 3, weightKg: 1980 });
    expect(stats.weight).to.deep.equal(Weight_build(1980, "kg"));
  });

  it("gives the busiest muscle 1 and skips unfinished sets", () => {
    const muscles = WorkoutStoryCard_muscles(record, settings);
    expect(muscles.chest).to.equal(1);
    expect(muscles.quadriceps).to.be.greaterThan(0).and.lessThan(1);
    expect(muscles.calves ?? 0).to.be.lessThan(muscles.chest!);
  });

  it("has no muscles for a workout with no finished sets", () => {
    expect(WorkoutStoryCard_muscles({ ...record, entries: [] }, settings)).to.deep.equal({});
  });
});

describe("LiftEquivalents_pick", () => {
  it("names a funny equivalent and changes with the seed", () => {
    const first = LiftEquivalents_pick(2438, 0);
    expect(first?.text).to.match(/^That's [\d,.]+ [a-zA-Z. ]+$/);
    const texts = new Set(
      Array.from({ length: LiftEquivalents_count(2438) }, (_, i) => LiftEquivalents_pick(2438, i)?.text)
    );
    expect(texts.size).to.equal(LiftEquivalents_count(2438));
  });

  it("gives 1,083 loaves of bread for 866.4 kg when it lands on bread", () => {
    const loaves = Array.from({ length: LiftEquivalents_count(866.4) }, (_, i) => LiftEquivalents_pick(866.4, i)).find(
      (e) => e?.emoji === "🍞"
    );
    expect(loaves?.text).to.equal("That's 1,083 loaves of bread");
  });

  it("skips things that would be under 2 or over 100,000", () => {
    const all = Array.from({ length: LiftEquivalents_count(500) }, (_, i) => LiftEquivalents_pick(500, i)!);
    expect(all.every((e) => e.count >= 2 && e.count <= 100000)).to.equal(true);
    expect(all.some((e) => e.emoji === "🐘")).to.equal(false);
  });

  it("has nothing for an empty workout and handles a negative seed", () => {
    expect(LiftEquivalents_pick(0, 3)).to.equal(undefined);
    expect(LiftEquivalents_pick(2438, -1)).to.not.equal(undefined);
  });
});
