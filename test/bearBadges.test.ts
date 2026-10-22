import "mocha";
import { expect } from "chai";
import { BearBadges_compute, BearBadges_forRecord, IBearBadgeSources } from "../src/models/bearBadges";
import { FoodLog_empty, IFoodLog } from "../src/models/foodLog";
import { IHistoryRecord, ISet } from "../src/types";
import { Weight_build } from "../src/models/weight";

const hour = 60 * 60 * 1000;
const day = 24 * hour;

function at(date: string, h: number): number {
  const d = new Date(`${date}T00:00:00`);
  d.setHours(h);
  return d.getTime();
}

function workout(id: number, start: number): IHistoryRecord {
  return {
    vtype: "history_record",
    date: new Date(start).toISOString(),
    programId: "adhoc",
    programName: "Ad-Hoc",
    day: 1,
    dayName: "Ad-Hoc",
    id,
    startTime: start,
    endTime: start + hour,
    entries: [],
  } as IHistoryRecord;
}

const set: ISet = {
  vtype: "set",
  id: "s",
  index: 0,
  completedReps: 5,
  completedWeight: Weight_build(100, "kg"),
  isCompleted: true,
};

function sources(history: IHistoryRecord[], extra: Partial<IBearBadgeSources> = {}): IBearBadgeSources {
  return { history, prs: {}, doneDays: new Set(), foodLog: FoodLog_empty(), ...extra };
}

function ids(s: IBearBadgeSources): string[] {
  return BearBadges_compute(s).map((b) => b.id);
}

describe("BearBadges", () => {
  it("gives early bear and night bear from the local start hour", () => {
    expect(ids(sources([workout(1, at("2026-10-01", 6))]))).to.deep.equal(["earlyBear"]);
    expect(ids(sources([workout(1, at("2026-10-01", 22))]))).to.deep.equal(["nightBear"]);
    expect(ids(sources([workout(1, at("2026-10-01", 12))]))).to.deep.equal([]);
  });

  it("needs a beaten previous best for First PR", () => {
    const first = { 1: { squat_barbell: { maxWeightSet: set } } };
    const beaten = { 2: { squat_barbell: { maxWeightSet: set, prevMaxWeightSet: set } } };
    const history = [workout(1, at("2026-10-01", 12)), workout(2, at("2026-10-02", 12))];
    expect(ids(sources(history, { prs: first }))).to.deep.equal([]);
    expect(BearBadges_compute(sources(history, { prs: beaten }))[0]).to.deep.include({ id: "firstPr", recordId: 2 });
  });

  it("gives out of hibernation after 14 days off and 100 workouts on the 100th", () => {
    const gap = [workout(1, at("2026-09-01", 12)), workout(2, at("2026-09-16", 12))];
    expect(ids(sources(gap))).to.deep.equal(["outOfHibernation"]);
    const many = Array.from({ length: 100 }, (_, i) => workout(i + 1, at("2026-01-01", 12) + i * day));
    expect(BearBadges_compute(sources(many)).find((b) => b.id === "hundredWorkouts")).to.deep.include({
      recordId: 100,
    });
  });

  it("puts day badges on the 7th day of the first run", () => {
    const doneDays = new Set([
      "2026-10-01",
      "2026-10-02",
      "2026-10-03",
      "2026-10-04",
      "2026-10-05",
      "2026-10-06",
      "2026-10-07",
    ]);
    expect(BearBadges_compute(sources([], { doneDays }))).to.deep.equal([{ id: "bearWeek", day: "2026-10-07" }]);
    doneDays.delete("2026-10-04");
    expect(ids(sources([], { doneDays }))).to.deep.equal([]);
  });

  it("gives honey hunter for 7 days at the protein minimum", () => {
    const empty = FoodLog_empty();
    const base = { ...empty, goals: { ...empty.goals, protein: { min: 120, max: 0 } } };
    const entries = Array.from({ length: 7 }, (_, i) => ({
      id: `${i}`,
      day: `2026-10-0${i + 1}`,
      meal: "lunch" as const,
      name: "Chicken",
      source: "manual" as const,
      nutrients: { calories: 0, protein: base.goals.protein.min, carbs: 0, fat: 0 },
      createdAt: 0,
    }));
    const foodLog = { ...base, entries } as IFoodLog;
    expect(ids(sources([], { foodLog }))).to.deep.equal(["honeyHunter"]);
  });

  it("marks a badge new on its own workout and leaves out later badges", () => {
    const history = [
      workout(1, at("2026-10-01", 6)),
      workout(2, at("2026-10-02", 12)),
      workout(3, at("2026-10-03", 23)),
    ];
    const badges = BearBadges_compute(sources(history));
    expect(BearBadges_forRecord(badges, history[0])).to.deep.include({ isNew: true, earned: 1 });
    expect(BearBadges_forRecord(badges, history[1])).to.deep.include({ isNew: false, earned: 1 });
    expect(BearBadges_forRecord(badges, history[1]).badge?.id).to.equal("earlyBear");
    expect(BearBadges_forRecord(badges, history[2]).badge?.id).to.equal("nightBear");
  });
});
