import "mocha";
import { expect } from "chai";
import {
  DailyChecklist_build,
  DailyChecklist_commit,
  DailyChecklist_doneDays,
  DailyChecklist_empty,
  DailyChecklist_greeting,
  DailyChecklist_hasCheckIn,
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
    ...patch,
  };
}

describe("DailyChecklist", () => {
  it("shows the last weight and that today's food log is empty", () => {
    const day = DailyChecklist_build(input());
    expect(day.title).to.equal("October 25's checklist");
    expect(day.items.map((i) => [i.key, i.subtitle, i.isDone])).to.deep.equal([
      ["weight", "Last: 74.8 kg · 6 days ago", false],
      ["food", "Start logging today", false],
    ]);
    expect(day.doneCount).to.equal(0);
  });

  it("marks weight and food done on the day they were logged", () => {
    const foodLog = { ...FoodLog_empty(), entries: [food("2026-10-19", 600), food("2026-10-19", 650)] };
    const day = DailyChecklist_build(input({ day: "2026-10-19", foodLog }));
    expect(day.items.map((i) => [i.subtitle, i.isDone])).to.deep.equal([
      ["Last: 74.8 kg · today", true],
      ["2 items · 1,250 Cal", true],
      ["Tap when you have looked back at this week's eating", false],
    ]);
    expect(day.doneCount).to.equal(2);
  });

  it("does not use a weight logged after the selected day", () => {
    const day = DailyChecklist_build(input({ day: "2026-10-15", today: "2026-10-25" }));
    expect(day.items[0].subtitle).to.equal("Last: 75.4 kg · 3 days ago");
    expect(day.items[1].subtitle).to.equal("Nothing logged");
  });

  it("adds the weekly check-in on the goal's start weekday, Monday by default", () => {
    expect(DailyChecklist_hasCheckIn("2026-10-19", undefined)).to.equal(true);
    expect(DailyChecklist_hasCheckIn("2026-10-22", at("2026-10-01"))).to.equal(true);
    const monday = DailyChecklist_build(input({ day: "2026-10-26", today: "2026-10-26" }));
    expect(monday.items.map((i) => i.key)).to.deep.equal(["weight", "food", "checkIn"]);
    const log = DailyChecklist_toggleCheckIn(DailyChecklist_empty(), "2026-10-26");
    expect(DailyChecklist_build(input({ day: "2026-10-26", log })).doneCount).to.equal(1);
    expect(DailyChecklist_toggleCheckIn(log, "2026-10-26").checkIns).to.deep.equal([]);
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

  it("greets by the time of day", () => {
    expect(DailyChecklist_greeting(7)).to.equal("Morning, there!");
    expect(DailyChecklist_greeting(14)).to.equal("Afternoon, there!");
    expect(DailyChecklist_greeting(21)).to.equal("Evening, there!");
  });
});
