import "mocha";
import { expect } from "chai";
import {
  IStepsLog,
  Steps_chart,
  Steps_chartLayout,
  Steps_empty,
  Steps_fromHealth,
  Steps_mergeHealth,
  Steps_parse,
  Steps_parseCount,
  Steps_setGoal,
  Steps_setManual,
} from "../src/models/steps";

function log(days: Record<string, number>, goal: number = 10000): IStepsLog {
  const result = { ...Steps_empty(), goal };
  for (const day of Object.keys(days)) {
    result.days[day] = { count: days[day], source: "health" };
  }
  return result;
}

describe("Steps", () => {
  it("parses a stored log, dropping bad days and clamping the goal", () => {
    const parsed = Steps_parse({
      goal: 123456,
      syncHealth: true,
      days: { "2026-10-20": { count: 8000, source: "manual" }, bad: { count: 1 }, "2026-10-19": { count: -5 } },
    });
    expect(parsed).to.deep.equal({
      version: 1,
      goal: 50000,
      syncHealth: true,
      days: { "2026-10-20": { count: 8000, source: "manual" } },
    });
    expect(Steps_parse(undefined)).to.deep.equal(Steps_empty());
  });

  it("rounds the goal to 500 steps", () => {
    expect(Steps_setGoal(Steps_empty(), 7740).goal).to.equal(7500);
    expect(Steps_setGoal(Steps_empty(), 10).goal).to.equal(1000);
  });

  it("reads a typed count with separators", () => {
    expect(Steps_parseCount("12,345")).to.equal(12345);
    expect(Steps_parseCount("")).to.equal(undefined);
    expect(Steps_parseCount("abc")).to.equal(undefined);
  });

  it("keeps a typed count when Health syncs the same day", () => {
    const typed = Steps_setManual(Steps_empty(), "2026-10-20", 9000);
    const merged = Steps_mergeHealth(typed, [
      { day: "2026-10-20", count: 4000 },
      { day: "2026-10-21", count: 3000 },
    ]);
    expect(merged.days["2026-10-20"]).to.deep.equal({ count: 9000, source: "manual" });
    expect(merged.days["2026-10-21"]).to.deep.equal({ count: 3000, source: "health" });
    expect(Steps_setManual(merged, "2026-10-21", 0).days["2026-10-21"]).to.equal(undefined);
  });

  it("buckets Health samples by local day", () => {
    const noon = new Date(2026, 9, 20, 12).getTime();
    expect(
      Steps_fromHealth([
        { timestamp: noon, value: 1234.6 },
        { timestamp: noon, value: NaN },
      ])
    ).to.deep.equal([{ day: "2026-10-20", count: 1235 }]);
  });

  it("builds a 14-day chart ending on the given day", () => {
    const chart = Steps_chart(log({ "2026-10-21": 12000, "2026-10-20": 6000, "2026-10-01": 20000 }), "2026-10-21");
    expect(chart.bars.length).to.equal(14);
    expect(chart.bars[0].day).to.equal("2026-10-08");
    expect(chart.bars[13]).to.deep.equal({ day: "2026-10-21", count: 12000, isGoalHit: true, label: "W" });
    expect(chart.average).to.equal(9000);
    expect(chart.daysHit).to.equal(1);
    expect(chart.daysWithData).to.equal(2);
    expect(chart.top).to.equal(15000);
  });

  it("has no average without data", () => {
    expect(Steps_chart(Steps_empty(), "2026-10-21").average).to.equal(undefined);
  });

  it("lays bars out with the goal line at the right height", () => {
    const chart = Steps_chart(log({ "2026-10-21": 10000 }, 5000), "2026-10-21", 2);
    const layout = Steps_chartLayout(chart, 5000, { width: 200, height: 120, labelHeight: 20 });
    expect(chart.top).to.equal(15000);
    expect(layout.goalY).to.equal(66.7);
    expect(layout.bars[1]).to.deep.include({ x: 120, width: 60, y: 33.3, height: 66.7, labelX: 150 });
    expect(layout.bars[0].height).to.equal(0);
  });
});
