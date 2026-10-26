import "mocha";
import { expect } from "chai";
import { BearBoard_lines, IBearBoardInput } from "../src/models/bearBoard";
import { BearTier_progress } from "../src/models/bearTier";
import { FoodLog_dayKey, FoodLog_empty, IFoodEntry, IFoodLog } from "../src/models/foodLog";
import { Weight_build } from "../src/models/weight";
import { IHistoryRecord, IStats, IStatsWeightValue } from "../src/types";

const hourMs = 3600000;
const dayMs = 24 * hourMs;
const now = new Date(2026, 9, 22, 12).getTime();
const today = FoodLog_dayKey(new Date(now));

function record(startTime: number): IHistoryRecord {
  return {
    vtype: "history_record",
    id: startTime,
    date: new Date(startTime).toISOString(),
    startTime,
    endTime: startTime + hourMs,
    programId: "p",
    programName: "P",
    day: 1,
    dayName: "Upper",
    entries: [],
  };
}

function weight(at: number, kg: number): IStatsWeightValue {
  return { vtype: "stat", value: Weight_build(kg, "kg"), timestamp: at };
}

function entry(calories: number, protein: number): IFoodEntry {
  return {
    id: `${today}-${calories}`,
    day: today,
    meal: "lunch",
    name: "Food",
    source: "manual",
    nutrients: { calories, protein, carbs: 0, fat: 0 },
    createdAt: now,
  };
}

function foodLog(entries: IFoodEntry[]): IFoodLog {
  const base = FoodLog_empty();
  return {
    ...base,
    entries,
    goals: { ...base.goals, calories: { min: 0, max: 2800 }, protein: { min: 0, max: 140 } },
  };
}

const noStats: IStats = { weight: {}, length: {}, percentage: {} };

function input(overrides: Partial<IBearBoardInput> = {}): IBearBoardInput {
  return {
    history: [],
    stats: noStats,
    foodLog: foodLog([]),
    units: "kg",
    dayName: "Upper",
    level: BearTier_progress(0, 0, "male"),
    countedKg: 0,
    now,
    ...overrides,
  };
}

function texts(lines: ReturnType<typeof BearBoard_lines>): [string, string, boolean][] {
  return lines.map((l) => [l.text, l.target, l.isDone]);
}

describe("BearBoard_lines", () => {
  it("shows three open to-do lines and the bear lines on an untouched day", () => {
    expect(texts(BearBoard_lines(input()))).to.deep.equal([
      ["Train · Upper", "plus", false],
      ["Eat · 0 of 2,800 kcal", "plus", false],
      ["Weigh-in · Sunday", "plus", false],
      ["Weight · not logged yet", "bear", false],
      ["Level 1 · 5,000 kg to Teen", "bear", false],
      ["Lifted 0 kg since day one", "bear", false],
    ]);
  });

  it("checks off every to-do line on a done day", () => {
    const stats: IStats = {
      weight: { weight: [weight(now - 31 * dayMs, 71.6), weight(now - hourMs, 72.4)] },
      length: {},
      percentage: {},
    };
    const lines = BearBoard_lines(
      input({
        history: [record(now - 2 * hourMs)],
        foodLog: foodLog([entry(2000, 90), entry(900, 60)]),
        stats,
        level: BearTier_progress(310000, 310000, "male"),
        countedKg: 310000,
      })
    );
    expect(texts(lines)).to.deep.equal([
      ["Train · Done today", "plus", true],
      ["Eat · 2,900 of 2,800 kcal", "plus", true],
      ["Weigh-in · Sunday", "plus", true],
      ["72.4 kg · +0.8 in 30 d", "bear", false],
      ["Level 6 · 70,000 kg to Athlete", "bear", false],
      ["Lifted 310,000 kg since day one", "bear", false],
    ]);
  });

  it("reads Rest day on the Train line when the schedule names no day", () => {
    const lines = BearBoard_lines(input({ dayName: undefined }));
    expect([lines[0].text, lines[0].isDone, lines[0].target]).to.deep.equal(["Train · Rest day", false, "plus"]);
  });

  it("drops the exclamation mark the today pill adds and counts kcal without a target", () => {
    const base = FoodLog_empty();
    const lines = BearBoard_lines(input({ dayName: "Push day", foodLog: { ...base, entries: [entry(640, 20)] } }));
    expect(lines.slice(0, 2).map((l) => [l.text, l.isDone])).to.deep.equal([
      ["Train · Push day", false],
      ["Eat · 640 kcal", true],
    ]);
  });

  it("names the weigh-in day from the goal start and shows the weight in the user's units", () => {
    const stats: IStats = { weight: { weight: [weight(now - dayMs, 64)] }, length: {}, percentage: {} };
    const thursday = new Date(2026, 9, 15, 9).getTime();
    const lines = BearBoard_lines(input({ goalStartedAt: thursday, stats, units: "lb" }));
    expect(lines[2].text).to.equal("Weigh-in · Thursday");
    expect(lines[3].text).to.equal("141.0 lb");
  });

  it("shows the top level without a next step", () => {
    const lines = BearBoard_lines(input({ level: BearTier_progress(9e7, 9e7, "male"), countedKg: 9e7 }));
    expect(lines[4].text).to.equal("Level 12 · top level");
  });
});
