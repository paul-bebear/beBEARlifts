import "mocha";
import { expect } from "chai";
import { BearBoard_goalLines, BearBoard_lines, IBearBoardInput } from "../src/models/bearBoard";
import { IProgramGoal } from "../src/models/programGoal";
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
    workouts: [],
    now,
    ...overrides,
  };
}

function goal(overrides: Partial<IProgramGoal> = {}): IProgramGoal {
  return { kind: "buildMuscle", activity: "5to10k", startedAt: now, ...overrides };
}

function texts(lines: ReturnType<typeof BearBoard_lines>): [string, string, boolean][] {
  return lines.map((l) => [l.text, l.target, l.isDone]);
}

describe("BearBoard_lines", () => {
  it("shows three open to-do lines and the bear lines on an untouched day", () => {
    expect(texts(BearBoard_lines(input()))).to.deep.equal([
      ["Upper", "plus", false],
      ["0 of 2,800 cal", "plus", false],
      ["Weight: Sunday", "plus", false],
      ["Streak · 0 days", "streak", false],
      ["Goal: tap to set one", "goal", false],
      ["Weight · not logged yet", "bear", false],
      ["Level 1 · 2,000 kg to go", "bear", false],
      ["Lifted 0 kg", "bear", false],
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
      ["Done today", "plus", true],
      ["2,900 of 2,800 cal", "plus", true],
      ["Weight: Sunday", "plus", true],
      ["Streak · 1 day", "streak", false],
      ["Goal: tap to set one", "goal", false],
      ["72.4 kg · +0.8 in 30 d", "bear", false],
      ["Level 6 · 150,000 kg to go", "bear", false],
      ["Lifted 310,000 kg", "bear", false],
    ]);
  });

  it("reads Rest day on the Train line when the schedule names no day", () => {
    const lines = BearBoard_lines(input({ dayName: undefined }));
    expect([lines[0].text, lines[0].isDone, lines[0].target]).to.deep.equal(["Rest day", false, "plus"]);
  });

  it("writes the Train line as the bare day name, and Workout for a day with no letters in its name", () => {
    expect(BearBoard_lines(input({ dayName: "123" }))[0].text).to.equal("Workout");
    expect(BearBoard_lines(input({ dayName: "Upper" }))[0].text).to.equal("Upper");
  });

  it("drops the exclamation mark the today pill adds and counts cal without a target", () => {
    const base = FoodLog_empty();
    const lines = BearBoard_lines(input({ dayName: "Push day", foodLog: { ...base, entries: [entry(640, 20)] } }));
    expect(lines.slice(0, 2).map((l) => [l.text, l.isDone])).to.deep.equal([
      ["Push day", false],
      ["640 cal", true],
    ]);
  });

  it("names the weigh-in day from the goal start and shows the weight in the user's units", () => {
    const stats: IStats = { weight: { weight: [weight(now - dayMs, 64)] }, length: {}, percentage: {} };
    const thursday = new Date(2026, 9, 15, 9).getTime();
    const lines = BearBoard_lines(input({ goal: goal({ startedAt: thursday }), stats, units: "lb" }));
    expect(lines[2].text).to.equal("Weight: Thursday");
    expect(lines[6].text).to.equal("141.0 lb");
  });

  it("shortens the lifted, level and goal-since lines for the two-column board", () => {
    const lines = BearBoard_lines(
      input({
        goal: goal({ startedAt: new Date(2026, 9, 21, 9).getTime(), startWeight: Weight_build(73, "kg") }),
        level: BearTier_progress(0, 65827, "male"),
        countedKg: 45827,
      })
    );
    const text = (id: string): string => lines.find((l) => l.id === id)!.text;
    expect(text("lifted")).to.equal("Lifted 45,827 kg");
    expect(text("level")).to.match(/^Level \d+ · [\d,]+ kg to go$/);
    expect(text("goalSince")).to.equal("Since Oct 21 · 73 kg");
  });

  it("shows the top level without a next step", () => {
    const lines = BearBoard_lines(input({ level: BearTier_progress(9e7, 9e7, "male"), countedKg: 9e7 }));
    expect(lines[6].text).to.equal("Level 12 · top level");
  });

  it("counts the streak from the counted workouts and the food log, as the streak screen does", () => {
    const base = FoodLog_empty();
    const yesterday = now - dayMs;
    const lines = BearBoard_lines(
      input({
        workouts: [
          { record: record(now - 2 * dayMs), countedKg: 1000 },
          { record: record(yesterday), countedKg: 1000 },
        ],
        foodLog: { ...base, entries: [entry(640, 20)] },
      })
    );
    expect(lines[3]).to.deep.equal({ id: "streak", text: "Streak · 3 days", isDone: false, target: "streak" });
  });

  it("keeps a streak alive through a day that is still open, and ends it after a missed day", () => {
    const open = BearBoard_lines(input({ workouts: [{ record: record(now - dayMs), countedKg: 1000 }] }));
    expect(open[3].text).to.equal("Streak · 1 day");
    const missed = BearBoard_lines(input({ workouts: [{ record: record(now - 3 * dayMs), countedKg: 1000 }] }));
    expect(missed[3].text).to.equal("Streak · 0 days");
  });

  it("keeps all nine lines in order with a goal set", () => {
    const lines = BearBoard_lines(input({ goal: goal({ startWeight: Weight_build(73, "kg") }) }));
    expect(lines.map((l) => [l.id, l.target])).to.deep.equal([
      ["train", "plus"],
      ["food", "plus"],
      ["weighIn", "plus"],
      ["streak", "streak"],
      ["goal", "goal"],
      ["goalSince", "goal"],
      ["weight", "bear"],
      ["level", "bear"],
      ["lifted", "bear"],
    ]);
  });
});

describe("BearBoard_goalLines", () => {
  const october21 = new Date(2026, 9, 21, 9).getTime();

  it("writes the goal, the start date and the start weight", () => {
    const lines = BearBoard_goalLines(goal({ startedAt: october21, startWeight: Weight_build(73, "kg") }), "kg", now);
    expect(texts(lines)).to.deep.equal([
      ["Goal: build muscle", "goal", false],
      ["Since Oct 21 · 73 kg", "goal", false],
    ]);
  });

  it("drops the weight when the goal has no start weight", () => {
    const lines = BearBoard_goalLines(goal({ startedAt: october21 }), "kg", now);
    expect(lines.map((l) => l.text)).to.deep.equal(["Goal: build muscle", "Since Oct 21"]);
  });

  it("adds the year when the goal started in an earlier year", () => {
    const lastYear = new Date(2025, 9, 21, 9).getTime();
    const lines = BearBoard_goalLines(goal({ startedAt: lastYear, startWeight: Weight_build(73, "kg") }), "kg", now);
    expect(lines[1].text).to.equal("Since Oct 21, 2025 · 73 kg");
  });

  it("converts the start weight to the user's units and names other goals", () => {
    const lines = BearBoard_goalLines(
      goal({ kind: "loseFat", startedAt: october21, startWeight: Weight_build(100, "kg") }),
      "lb",
      now
    );
    expect(lines.map((l) => l.text)).to.deep.equal(["Goal: lose fat", "Since Oct 21 · 220.5 lb"]);
  });

  it("asks the user to set a goal when there is none", () => {
    expect(texts(BearBoard_goalLines(undefined, "kg", now))).to.deep.equal([["Goal: tap to set one", "goal", false]]);
  });
});
