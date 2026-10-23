import "mocha";
import { expect } from "chai";
import { BearBoard_tiles, IBearBoardInput } from "../src/models/bearBoard";
import { FoodLog_dayKey, FoodLog_empty, IFoodEntry, IFoodLog } from "../src/models/foodLog";
import { Notes_empty, INote } from "../src/models/notes";
import { Weight_build } from "../src/models/weight";
import { IHistoryRecord, IStatsWeightValue } from "../src/types";

const hourMs = 3600000;
const dayMs = 24 * hourMs;
const now = new Date(2026, 9, 22, 12).getTime();
const weekStart = new Date(2026, 9, 19).getTime();

function record(endTime: number): IHistoryRecord {
  return {
    vtype: "history_record",
    id: endTime,
    date: new Date(endTime).toISOString(),
    startTime: endTime - hourMs,
    endTime,
    programId: "p",
    programName: "P",
    day: 1,
    dayName: "Day",
    entries: [],
  };
}

function weight(at: number, kg: number): IStatsWeightValue {
  return { vtype: "stat", value: Weight_build(kg, "kg"), timestamp: at };
}

function checkIn(day: string, energy: 1 | 2 | 3 | 4 | 5): INote {
  return {
    id: day,
    day,
    createdAt: now,
    updatedAt: now,
    kind: "checkIn",
    title: "",
    body: "",
    energy,
  };
}

function entry(day: string, calories: number, protein: number): IFoodEntry {
  return {
    id: `${day}-${calories}`,
    day,
    meal: "lunch",
    name: "Food",
    source: "manual",
    nutrients: { calories, protein, carbs: 0, fat: 0 },
    createdAt: now,
  };
}

function foodLog(goals: { calories?: number; protein?: number }): IFoodLog {
  const today = FoodLog_dayKey(new Date(now));
  const base = FoodLog_empty();
  return {
    ...base,
    entries: [entry(today, 840, 50), entry(today, 400, 34), entry(FoodLog_dayKey(new Date(now - dayMs)), 2000, 100)],
    goals: {
      ...base.goals,
      calories: { min: 0, max: goals.calories ?? 0 },
      protein: { min: 0, max: goals.protein ?? 0 },
    },
  };
}

function input(overrides: Partial<IBearBoardInput> = {}): IBearBoardInput {
  return {
    history: [],
    workouts: [],
    stats: { weight: {}, length: {}, percentage: {} },
    notes: Notes_empty(),
    foodLog: FoodLog_empty(),
    units: "kg",
    plannedPerWeek: 3,
    weekStart,
    now,
    ...overrides,
  };
}

describe("BearBoard", () => {
  it("shows week, weight and food tiles for a new user", () => {
    expect(BearBoard_tiles(input()).map((t) => [t.id, t.value, t.label, t.target])).to.deep.equal([
      ["week", "0 of 3", "workouts this week", "streak"],
      ["weight", "–", "log your weight", "stats"],
      ["food", "0", "kcal today", "journal"],
    ]);
  });

  it("leaves out the per workout and energy tiles, which are layer 3", () => {
    const notes = { ...Notes_empty(), notes: [checkIn("2026-10-22", 5)] };
    const workouts = [{ record: record(now - dayMs), countedKg: 4000 }];
    const ids = BearBoard_tiles(input({ notes, workouts })).map((t) => t.id);
    expect(ids).to.deep.equal(["week", "weight", "food"]);
  });

  it("shows today's kcal and protein against the targets", () => {
    const tile = BearBoard_tiles(input({ foodLog: foodLog({ calories: 2800, protein: 140 }) }))[2];
    expect([tile.value, tile.label, tile.target]).to.deep.equal([
      "1,240 / 2,800 kcal",
      "84 of 140 g protein today",
      "journal",
    ]);
  });

  it("shows only the kcal eaten today when no target is set", () => {
    const tile = BearBoard_tiles(input({ foodLog: foodLog({}) }))[2];
    expect([tile.value, tile.label]).to.deep.equal(["1,240", "kcal today"]);
  });

  it("keeps the kcal label when only the calorie target is set", () => {
    const tile = BearBoard_tiles(input({ foodLog: foodLog({ calories: 2800 }) }))[2];
    expect([tile.value, tile.label]).to.deep.equal(["1,240 / 2,800 kcal", "kcal today"]);
  });

  it("shows the protein line when only the protein target is set", () => {
    const tile = BearBoard_tiles(input({ foodLog: foodLog({ protein: 140 }) }))[2];
    expect([tile.value, tile.label]).to.deep.equal(["1,240 kcal", "84 of 140 g protein today"]);
  });

  it("counts only this week's finished workouts", () => {
    const history = [
      record(weekStart - hourMs),
      record(weekStart + hourMs),
      record(now - hourMs),
      record(now + hourMs),
    ];
    expect(BearBoard_tiles(input({ history }))[0].value).to.equal("2 of 3");
  });

  it("shows the latest weight and the change over 30 days in the user's units", () => {
    const stats = {
      weight: { weight: [weight(now - 40 * dayMs, 70), weight(now - 31 * dayMs, 71), weight(now - dayMs, 72.4)] },
      length: {},
      percentage: {},
    };
    const tile = BearBoard_tiles(input({ stats }))[1];
    expect([tile.value, tile.label]).to.deep.equal(["72.4 kg", "weight · +1.4 in 30 d"]);
    const lb = BearBoard_tiles(input({ stats, units: "lb" }))[1];
    expect(lb.value).to.equal("159.5 lb");
  });

  it("shows a single weight without a change", () => {
    const stats = { weight: { weight: [weight(now - dayMs, 64)] }, length: {}, percentage: {} };
    expect(BearBoard_tiles(input({ stats }))[1].label).to.equal("weight");
  });
});
