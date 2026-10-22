import "mocha";
import { expect } from "chai";
import {
  DailyChecklist_build,
  DailyChecklist_commit,
  DailyChecklist_doneDays,
  DailyChecklist_empty,
  DailyChecklist_greeting,
  DailyChecklist_parse,
  DailyChecklist_streak,
  DailyChecklist_toggleCheckIn,
  IChecklistDayInput,
} from "../src/models/dailyChecklist";
import { FoodLog_empty, IFoodEntry } from "../src/models/foodLog";
import { IStats } from "../src/types";

const at = (day: string, hour: number = 8): number => {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(y, m - 1, d, hour).getTime();
};

function food(day: string, calories: number): IFoodEntry {
  return {
    id: `${day}-${calories}`,
    day,
    meal: "lunch",
    name: "Rice",
    source: "manual",
    nutrients: { calories, protein: 0, carbs: 0, fat: 0 },
    createdAt: at(day),
  };
}

const stats: IStats = {
  weight: {
    weight: [
      { vtype: "stat", value: { value: 74.8, unit: "kg" }, timestamp: at("2026-10-19") },
      { vtype: "stat", value: { value: 75.4, unit: "kg" }, timestamp: at("2026-10-12") },
    ],
  },
  length: {},
  percentage: {},
};

function input(patch: Partial<IChecklistDayInput> = {}): IChecklistDayInput {
  return {
    day: "2026-10-25",
    today: "2026-10-25",
    stats,
    foodLog: FoodLog_empty(),
    log: DailyChecklist_empty(),
    units: "kg",
    startWeekFromMonday: true,
    ...patch,
  };
}

describe("DailyChecklist", () => {
  it("shows Train, Feed the bear and weekly Weigh-in", () => {
    const day = DailyChecklist_build(input());
    expect(day.title).to.equal("October 25's checklist");
    expect(day.items.map((i) => [i.key, i.subtitle, i.isDone])).to.deep.equal([
      ["train", "Open your workout", false],
      ["food", "Start logging today", false],
      ["weight", "Weekly, every Monday · Last: 74.8 kg · 6 days ago", true],
    ]);
    expect(day.items.map((item) => item.title)).to.deep.equal(["Train", "Feed the bear", "Weigh-in"]);
    expect(day.doneCount).to.equal(1);
  });

  it("marks weight and food done on the day they were logged", () => {
    const foodLog = { ...FoodLog_empty(), entries: [food("2026-10-19", 600), food("2026-10-19", 650)] };
    const day = DailyChecklist_build(input({ day: "2026-10-19", foodLog }));
    expect(day.items.map((i) => [i.subtitle, i.isDone])).to.deep.equal([
      ["Open your workout", false],
      ["2 items · 1,250 Cal", true],
      ["Weekly, every Monday · Last: 74.8 kg · today", true],
    ]);
    expect(day.doneCount).to.equal(2);
  });

  it("does not use a weight logged after the selected day", () => {
    const day = DailyChecklist_build(input({ day: "2026-10-15", today: "2026-10-25" }));
    expect(day.items[2].subtitle).to.equal("Weekly, every Monday · Last: 75.4 kg · 3 days ago");
    expect(day.items[1].subtitle).to.equal("Nothing logged");
  });

  it("resets Weigh-in at the next week's start", () => {
    const day = DailyChecklist_build(input({ day: "2026-10-26" }));
    expect(day.items[2].isDone).to.equal(false);
  });

  it("uses Sunday when the user starts weeks on Sunday", () => {
    const day = DailyChecklist_build(input({ startWeekFromMonday: false }));
    expect(day.items[2].subtitle).to.equal("Weekly, every Sunday · Last: 74.8 kg · 6 days ago");
    expect(day.items[2].isDone).to.equal(false);
  });

  it("uses the configured weekday and keeps a missed weigh-in due", () => {
    const emptyStats: IStats = { weight: {}, length: {}, percentage: {} };
    const before = DailyChecklist_build(input({ day: "2026-10-20", stats: emptyStats, goalWeekday: 4 }));
    expect(before.items.map((item) => item.key)).to.deep.equal(["train", "food"]);
    for (const selected of ["2026-10-22", "2026-10-23", "2026-10-25"]) {
      const day = DailyChecklist_build(input({ day: selected, stats: emptyStats, goalWeekday: 4 }));
      expect(day.items[2].subtitle).to.equal("Weekly, every Thursday · No weight logged yet");
      expect(day.items[2].isDone).to.equal(false);
    }
  });

  it("keeps an early weigh-in visible and ticked for the rest of the week", () => {
    for (const selected of ["2026-10-19", "2026-10-20", "2026-10-22", "2026-10-25"]) {
      const day = DailyChecklist_build(input({ day: selected, goalWeekday: 4 }));
      expect(day.items[2].isDone).to.equal(true);
    }
  });

  it("does not count a future weigh-in", () => {
    const futureStats: IStats = { weight: { weight: [stats.weight.weight![0]] }, length: {}, percentage: {} };
    const day = DailyChecklist_build(input({ day: "2026-10-18", stats: futureStats }));
    expect(day.items[2].isDone).to.equal(false);
    expect(day.items[2].subtitle).to.equal("Weekly, every Monday · No weight logged yet");
  });

  it("chooses the latest weight from unsorted entries and converts units", () => {
    const day = DailyChecklist_build(input({ units: "lb" }));
    expect(day.items[2].subtitle).to.equal("Weekly, every Monday · Last: 164.9 lb · 6 days ago");
  });

  it("falls back to the week's first day for an invalid weekday", () => {
    for (const goalWeekday of [-1, 7, 1.5, NaN]) {
      expect(DailyChecklist_build(input({ goalWeekday })).items[2].subtitle).to.contain("Weekly, every Monday");
    }
  });

  it("ticks Train only for a finished workout on the selected day", () => {
    const history = [{ startTime: at("2026-10-25") }];
    expect(DailyChecklist_build(input({ history })).items[0].isDone).to.equal(true);
    expect(DailyChecklist_build(input({ day: "2026-10-26", history })).items[0].isDone).to.equal(false);
  });

  it("preserves stored nutrition check-ins without adding a checklist row", () => {
    const log = DailyChecklist_toggleCheckIn(DailyChecklist_empty(), "2026-10-25");
    expect(DailyChecklist_build(input({ log })).items.map((item) => item.key)).to.deep.equal([
      "train",
      "food",
      "weight",
    ]);
    expect(DailyChecklist_toggleCheckIn(log, "2026-10-25").checkIns).to.deep.equal([]);
  });

  it("counts a streak of days with at least one item done", () => {
    const foodLog = { ...FoodLog_empty(), entries: [food("2026-10-20", 1), food("2026-10-18", 1)] };
    const log = { ...DailyChecklist_empty(), checkIns: ["2026-10-17"] };
    const done = DailyChecklist_doneDays({ stats, foodLog, log });
    expect(DailyChecklist_streak(done, "2026-10-20")).to.equal(4);
    expect(DailyChecklist_streak(done, "2026-10-21")).to.equal(4);
    expect(DailyChecklist_streak(done, "2026-10-22")).to.equal(0);
    expect(DailyChecklist_streak(new Set(), "2026-10-22")).to.equal(0);
  });

  it("parses a stored log and keeps the commitment time", () => {
    expect(DailyChecklist_parse({ checkIns: ["2026-10-19", "x", "2026-10-19"], committedAt: 5 })).to.deep.equal({
      version: 1,
      checkIns: ["2026-10-19"],
      committedAt: 5,
    });
    expect(DailyChecklist_parse(undefined)).to.deep.equal(DailyChecklist_empty());
    expect(DailyChecklist_commit(DailyChecklist_empty(), 9).committedAt).to.equal(9);
  });

  it("counts completed workouts in the streak", () => {
    const done = DailyChecklist_doneDays({
      stats,
      foodLog: FoodLog_empty(),
      log: DailyChecklist_empty(),
      history: [{ startTime: at("2026-10-20") }],
    });
    expect(DailyChecklist_streak(done, "2026-10-20")).to.equal(2);
  });

  it("greets by the time of day", () => {
    expect(DailyChecklist_greeting(7)).to.equal("Good morning");
    expect(DailyChecklist_greeting(14)).to.equal("Good afternoon");
    expect(DailyChecklist_greeting(21)).to.equal("Good evening");
  });
});
