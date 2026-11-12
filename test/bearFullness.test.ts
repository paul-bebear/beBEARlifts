import "mocha";
import { expect } from "chai";
import {
  BearFullness_defaultTargetCalories,
  BearFullness_hungryBelow,
  BearFullness_percent,
  BearFullness_targetCalories,
} from "../src/models/bearFullness";
import { FoodLog_dayKey, FoodLog_empty, IFoodEntry, IFoodLog } from "../src/models/foodLog";

const now = new Date(2026, 9, 20, 12).getTime();
const today = FoodLog_dayKey(new Date(now));

function entry(calories: number, day: string = today): IFoodEntry {
  return {
    id: `${day}-${calories}`,
    day,
    meal: "lunch",
    name: "Food",
    source: "manual",
    createdAt: now,
    nutrients: { calories, protein: 0, carbs: 0, fat: 0 },
  };
}

function log(entries: IFoodEntry[], calories?: { min: number; max: number }): IFoodLog {
  const base = FoodLog_empty();
  return { ...base, entries, goals: calories == null ? base.goals : { ...base.goals, calories } };
}

describe("BearFullness_targetCalories", () => {
  it("is the number the whiteboard food line shows: the minimum, else the maximum", () => {
    expect(BearFullness_targetCalories(log([], { min: 2600, max: 3000 }))).to.equal(2600);
    expect(BearFullness_targetCalories(log([], { min: 0, max: 2800 }))).to.equal(2800);
  });

  it("falls back to 2,500 when no calorie target is set", () => {
    expect(BearFullness_defaultTargetCalories).to.equal(2500);
    expect(BearFullness_targetCalories(log([]))).to.equal(2500);
  });
});

describe("BearFullness_percent", () => {
  it("is 0 on an empty day and on a day with only other days' food", () => {
    expect(BearFullness_percent(log([]), now)).to.equal(0);
    expect(BearFullness_percent(log([entry(2000, "2026-10-19")]), now)).to.equal(0);
  });

  it("is 100 times today's calories over the target, whatever the number of items", () => {
    const goals = { min: 0, max: 2800 };
    expect(BearFullness_percent(log([entry(840)], goals), now)).to.equal(30);
    expect(BearFullness_percent(log([entry(280), entry(280), entry(280)], goals), now)).to.equal(30);
  });

  it("stops at 100", () => {
    expect(BearFullness_percent(log([entry(5000)], { min: 0, max: 2800 }), now)).to.equal(100);
  });

  it("ignores a calorie value that is not a number", () => {
    expect(BearFullness_percent(log([entry(NaN)]), now)).to.equal(0);
  });

  it("keeps the hungry line at 20", () => {
    expect(BearFullness_hungryBelow).to.equal(20);
  });
});
