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

const now = new Date(2026, 9, 21, 18, 0).getTime();
const hourMs = 3600000;
const tomorrow = new Date(2026, 9, 22, 0, 0).getTime();

describe("StatsLatest", () => {
  it("sorts readable entries up to the end of today, oldest first", () => {
    const values = [
      weigh(now - hourMs, 72),
      weigh(now - 3 * hourMs, 70),
      weigh(now - 2 * hourMs, Number.NaN),
      weigh(now - 90 * 60000, 0),
      weigh(tomorrow, 99),
    ];
    expect(StatsLatest_entries(values, now).map((e) => e.value.value)).to.deep.equal([70, 72]);
  });

  it("uses an entry stamped 30 seconds ahead of now", () => {
    expect(StatsLatest_entry([weigh(now - hourMs, 70), weigh(now + 30000, 71)], now)?.value.value).to.equal(71);
  });

  it("uses an entry at 23:59 today", () => {
    const lateToday = new Date(2026, 9, 21, 23, 59).getTime();
    expect(StatsLatest_entry([weigh(now - hourMs, 70), weigh(lateToday, 71)], now)?.value.value).to.equal(71);
  });

  it("ignores an entry dated tomorrow", () => {
    expect(StatsLatest_entry([weigh(now - hourMs, 70), weigh(tomorrow, 90)], now)?.value.value).to.equal(70);
  });

  it("takes the later-stored entry when two share a timestamp", () => {
    expect(StatsLatest_entry([weigh(now, 70), weigh(now, 71)], now)?.value.value).to.equal(71);
  });

  it("has no entry for an empty or missing list", () => {
    expect(StatsLatest_entry(undefined, now)).to.equal(undefined);
    expect(StatsLatest_entry([weigh(tomorrow, 70)], now)).to.equal(undefined);
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
