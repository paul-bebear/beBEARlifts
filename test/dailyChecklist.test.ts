import "mocha";
import { expect } from "chai";
import {
  DailyChecklist_build,
  DailyChecklist_commit,
  DailyChecklist_doneDays,
  DailyChecklist_empty,
  DailyChecklist_parse,
  DailyChecklist_streak,
  DailyChecklist_toggleCheckIn,
  DailyChecklist_weighInWeekday,
  IChecklistDayInput,
} from "../src/models/dailyChecklist";
import { FoodLog_empty, IFoodEntry } from "../src/models/foodLog";
import { IBearCountedWorkout } from "../src/models/bearGrowth";
import { IHistoryRecord, IStats } from "../src/types";

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

function workout(day: string, hour: number, hours: number = 1): IBearCountedWorkout {
  const startTime = at(day, hour);
  const record = {
    vtype: "history_record",
    id: startTime,
    startTime,
    endTime: startTime + hours * 3600000,
    entries: [],
  };
  return { record: record as unknown as IHistoryRecord, countedKg: 100 };
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
    units: "kg",
    workoutDays: new Set<string>(),
    ...patch,
  };
}

describe("DailyChecklist", () => {
  it("lists Train, Feed the bear and Weigh-in, all open on an empty Sunday", () => {
    const day = DailyChecklist_build(input());
    expect(day.title).to.equal("October 25's checklist");
    expect(day.items.map((i) => [i.key, i.title, i.subtitle, i.isDone])).to.deep.equal([
      ["train", "Train", "Do today's workout", false],
      ["food", "Feed the bear", "Start logging today", false],
      ["weight", "Weigh-in", "Weekly, every Sunday · Last: 74.8 kg", false],
    ]);
    expect(day.doneCount).to.equal(0);
  });

  it("marks Train and Feed the bear done on the day they happened", () => {
    const foodLog = { ...FoodLog_empty(), entries: [food("2026-10-19", 600), food("2026-10-19", 650)] };
    const day = DailyChecklist_build(input({ day: "2026-10-19", foodLog, workoutDays: new Set(["2026-10-19"]) }));
    expect(day.items.map((i) => [i.subtitle, i.isDone])).to.deep.equal([
      ["Workout done", true],
      ["2 items · 1,250 Cal", true],
      ["Done this week · 74.8 kg", true],
    ]);
    expect(day.doneCount).to.equal(3);
  });

  it("keeps Feed the bear open until the day's calorie and protein targets are met", () => {
    const goals = {
      ...FoodLog_empty().goals,
      calories: { min: 2800, max: 3000 },
      protein: { min: 140, max: 180 },
    };
    const meal = { ...food("2026-10-25", 1240), nutrients: { calories: 1240, protein: 84, carbs: 0, fat: 0 } };
    const half = DailyChecklist_build(input({ foodLog: { ...FoodLog_empty(), goals, entries: [meal] } }));
    expect([half.items[1].subtitle, half.items[1].isDone]).to.deep.equal([
      "1,240 / 2,800 Cal · 84 / 140 g protein",
      false,
    ]);
    const big = { ...meal, id: "big", nutrients: { calories: 1600, protein: 60, carbs: 0, fat: 0 } };
    const full = DailyChecklist_build(input({ foodLog: { ...FoodLog_empty(), goals, entries: [meal, big] } }));
    expect(full.items[1].isDone).to.equal(true);
  });

  it("checks only the targets that are set", () => {
    const goals = { ...FoodLog_empty().goals, calories: { min: 0, max: 2000 } };
    const day = DailyChecklist_build(
      input({ foodLog: { ...FoodLog_empty(), goals, entries: [food("2026-10-25", 2100)] } })
    );
    expect([day.items[1].subtitle, day.items[1].isDone]).to.deep.equal(["2,100 / 2,000 Cal", true]);
  });

  it("does not use a weight logged after the selected day", () => {
    const day = DailyChecklist_build(input({ day: "2026-10-10", today: "2026-10-25" }));
    expect(day.items[0].subtitle).to.equal("No workout");
    expect(day.items[1].subtitle).to.equal("Nothing logged");
    expect(day.items[2].subtitle).to.equal("Weekly, every Sunday");
  });

  it("asks for a weigh-in with no history yet", () => {
    const empty: IStats = { weight: {}, length: {}, percentage: {} };
    expect(DailyChecklist_build(input({ stats: empty })).items[2].subtitle).to.equal("Weekly, every Sunday");
  });

  it("keeps Weigh-in ticked from the goal's weekday until the next one", () => {
    const goalStartedAt = at("2026-10-01");
    const weighIn = (day: string, withWeights: IStats = stats): { done: boolean; subtitle: string } => {
      const item = DailyChecklist_build(input({ day, today: day, stats: withWeights, goalStartedAt })).items[2];
      return { done: item.isDone, subtitle: item.subtitle };
    };
    const thursdayWeight: IStats = {
      ...stats,
      weight: { weight: [{ vtype: "stat", value: { value: 74.2, unit: "kg" }, timestamp: at("2026-10-22") }] },
    };
    expect(weighIn("2026-10-19")).to.deep.equal({ done: true, subtitle: "Done this week · 74.8 kg" });
    expect(weighIn("2026-10-22")).to.deep.equal({ done: false, subtitle: "Weekly, every Thursday · Last: 74.8 kg" });
    expect(weighIn("2026-10-22", thursdayWeight).done).to.equal(true);
    expect(weighIn("2026-10-24", thursdayWeight).subtitle).to.equal("Done this week · 74.2 kg");
    expect(weighIn("2026-10-28", thursdayWeight).done).to.equal(true);
    expect(weighIn("2026-10-29", thursdayWeight).done).to.equal(false);
  });

  it("picks the weigh-in weekday from the goal, else the first day of the week", () => {
    expect(DailyChecklist_weighInWeekday(at("2026-10-01"), false)).to.equal(4);
    expect(DailyChecklist_weighInWeekday(undefined, false)).to.equal(0);
    expect(DailyChecklist_weighInWeekday(undefined, true)).to.equal(1);
  });

  it("toggles a stored check-in day on and off", () => {
    const log = DailyChecklist_toggleCheckIn(DailyChecklist_empty(), "2026-10-26");
    expect(log.checkIns).to.deep.equal(["2026-10-26"]);
    expect(DailyChecklist_toggleCheckIn(log, "2026-10-26").checkIns).to.deep.equal([]);
  });

  it("counts a streak of days with a counted workout or a food entry", () => {
    const foodLog = { ...FoodLog_empty(), entries: [food("2026-10-20", 1), food("2026-10-18", 1)] };
    const workouts = [workout("2026-10-17", 20), workout("2026-10-19", 9)];
    const done = DailyChecklist_doneDays({ foodLog, workouts });
    expect(Array.from(done).sort()).to.deep.equal(["2026-10-17", "2026-10-18", "2026-10-19", "2026-10-20"]);
    expect(DailyChecklist_streak(done, "2026-10-20")).to.equal(4);
    expect(DailyChecklist_streak(done, "2026-10-21")).to.equal(4);
    expect(DailyChecklist_streak(done, "2026-10-22")).to.equal(0);
    expect(DailyChecklist_streak(new Set(), "2026-10-22")).to.equal(0);
  });

  it("dates a workout by the day it ended and ignores weigh-ins and check-ins", () => {
    const lateNight = workout("2026-10-17", 23, 2);
    const done = DailyChecklist_doneDays({ foodLog: FoodLog_empty(), workouts: [lateNight] });
    expect(Array.from(done)).to.deep.equal(["2026-10-18"]);
    expect(DailyChecklist_doneDays({ foodLog: FoodLog_empty(), workouts: [] }).size).to.equal(0);
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
});
