import "mocha";
import { expect } from "chai";
import {
  ILiftEquivalent,
  LiftEquivalents_all,
  LiftEquivalents_count,
  LiftEquivalents_formatCount,
  LiftEquivalents_pick,
} from "../src/models/liftEquivalents";
import {
  WorkoutStoryCard_duration,
  WorkoutStoryCard_muscles,
  WorkoutStoryCard_stats,
  WorkoutStoryCard_weightNumber,
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

  it("writes the weight as a whole number with thousands commas", () => {
    expect(WorkoutStoryCard_weightNumber(Weight_build(12345.6, "lb"))).to.equal("12,346");
  });
});

function allPicks(totalKg: number): ILiftEquivalent[] {
  return Array.from({ length: LiftEquivalents_count(totalKg) }, (_, i) => LiftEquivalents_pick(totalKg, i)!);
}

describe("LiftEquivalents_pick", () => {
  it("has at least 40 things, each with a plural name and an emoji", () => {
    const things = LiftEquivalents_all();
    expect(things.length).to.be.at.least(40);
    expect(new Set(things.map((t) => t.many)).size).to.equal(things.length);
    expect(things.every((t) => t.kg > 0 && t.emoji !== "" && t.many !== t.one)).to.equal(true);
  });

  it("keeps every count between 2 and 999, so there is never 0.3 elephants or 48,000 bananas", () => {
    for (const totalKg of [1, 25, 300, 2438, 15000, 80000, 600000]) {
      const picks = allPicks(totalKg);
      expect(picks.length, `${totalKg} kg`).to.be.at.least(3);
      expect(picks.every((e) => e.count >= 2 && e.count <= 999)).to.equal(true);
    }
    expect(allPicks(500).some((e) => e.noun === "African elephants")).to.equal(false);
    expect(allPicks(6000).some((e) => e.noun === "bananas")).to.equal(false);
  });

  it("shows every fitting thing once before it repeats", () => {
    const nouns = new Set(allPicks(2438).map((e) => e.noun));
    expect(nouns.size).to.equal(LiftEquivalents_count(2438));
  });

  it("changes both the thing and the phrase on each shuffle", () => {
    const a = LiftEquivalents_pick(2438, 10)!;
    const b = LiftEquivalents_pick(2438, 11)!;
    expect(a.noun).to.not.equal(b.noun);
    expect(a.lead + a.tail).to.not.equal(b.lead + b.tail);
  });

  it("builds the line from the phrase, the number and the noun", () => {
    const leads = new Set<string>();
    for (let seed = 0; seed < 30; seed += 1) {
      const e = LiftEquivalents_pick(1200, seed)!;
      leads.add(e.lead);
      expect(e.text).to.equal([e.lead, `${e.number} ${e.noun}`, e.tail].filter((s) => s !== "").join(" "));
    }
    expect(leads.size).to.be.at.least(4);
    const piano = allPicks(1200).find((e) => e.noun === "grand pianos");
    expect(piano?.number).to.equal("3");
  });

  it("rounds under 10 to one decimal and adds commas from 1,000", () => {
    expect([2.04, 2.46, 9.96, 148.4, 1083.2].map(LiftEquivalents_formatCount)).to.deep.equal([
      "2",
      "2.5",
      "10",
      "148",
      "1,083",
    ]);
  });

  it("has nothing for an empty workout and handles a negative seed", () => {
    expect(LiftEquivalents_pick(0, 3)).to.equal(undefined);
    expect(LiftEquivalents_pick(2438, -1)).to.not.equal(undefined);
  });
});
