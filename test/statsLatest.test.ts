import "mocha";
import { expect } from "chai";
import {
  StatsLatest_bodyWeightIn,
  StatsLatest_entries,
  StatsLatest_entry,
  StatsLatest_newest,
} from "../src/models/statsLatest";
import { IStatsWeightValue, IUnit } from "../src/types";

function weigh(timestamp: number, value: number, unit: IUnit = "kg"): IStatsWeightValue {
  return { vtype: "stat", value: { value, unit }, timestamp };
}

describe("StatsLatest", () => {
  it("sorts readable entries up to now, oldest first", () => {
    const values = [weigh(30, 72), weigh(10, 70), weigh(20, Number.NaN), weigh(25, 0), weigh(40, 99)];
    expect(StatsLatest_entries(values, 35).map((e) => e.timestamp)).to.deep.equal([10, 30]);
  });

  it("picks the newest entry and ignores one dated after now", () => {
    expect(StatsLatest_entry([weigh(10, 70), weigh(50, 90), weigh(30, 72)], 40)?.value.value).to.equal(72);
  });

  it("takes the later-stored entry when two share a timestamp", () => {
    expect(StatsLatest_entry([weigh(10, 70), weigh(10, 71)], 10)?.value.value).to.equal(71);
  });

  it("has no entry for an empty or missing list", () => {
    expect(StatsLatest_entry(undefined, 10)).to.equal(undefined);
    expect(StatsLatest_entry([weigh(20, 70)], 10)).to.equal(undefined);
  });

  it("finds the newest entry with no time limit", () => {
    expect(StatsLatest_newest([weigh(10, 70), weigh(9e15, 90)])?.value.value).to.equal(90);
  });

  it("keeps one decimal of body weight in the user's unit", () => {
    expect(StatsLatest_bodyWeightIn({ value: 79.8, unit: "kg" }, "kg")).to.equal(79.8);
    expect(StatsLatest_bodyWeightIn({ value: 176, unit: "lb" }, "kg")).to.equal(79.8);
    expect(StatsLatest_bodyWeightIn({ value: 176.4, unit: "lb" }, "lb")).to.equal(176.4);
    expect(StatsLatest_bodyWeightIn({ value: 79.8, unit: "kg" }, "lb")).to.equal(175.9);
  });
});
