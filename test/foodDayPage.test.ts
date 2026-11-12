import "mocha";
import { expect } from "chai";
import { FoodDayPage_build, FoodDayPage_meals } from "../src/models/foodDayPage";
import { FoodLog_empty, IFoodEntry, IFoodLog, IFoodMeal } from "../src/models/foodLog";

const now = new Date(2026, 9, 22, 19, 30).getTime();
const today = "2026-10-22";

function entry(id: string, day: string, meal: IFoodMeal, calories: number, protein: number): IFoodEntry {
  return {
    id,
    day,
    meal,
    name: id,
    source: "manual",
    nutrients: { calories, protein, carbs: 10, fat: 5 },
    createdAt: now,
  };
}

function log(entries: IFoodEntry[]): IFoodLog {
  return { ...FoodLog_empty(), entries };
}

describe("FoodDayPage_meals", () => {
  const filled = log([entry("a", today, "lunch", 500, 30), entry("b", today, "lunch", 300, 10)]);

  it("lists all four meals in order, empty ones with no entries", () => {
    const meals = FoodDayPage_meals(filled, today, true);
    expect(meals.map((m) => m.meal)).to.deep.equal(["breakfast", "lunch", "dinner", "snacks"]);
    expect(meals.map((m) => m.entries.length)).to.deep.equal([0, 2, 0, 0]);
  });

  it("leaves out the empty meals when asked", () => {
    expect(FoodDayPage_meals(filled, today, false).map((m) => m.meal)).to.deep.equal(["lunch"]);
  });

  it("keeps the entries of other days out", () => {
    const other = log([entry("a", "2026-10-21", "dinner", 700, 40)]);
    expect(FoodDayPage_meals(other, today, false)).to.deep.equal([]);
    expect(FoodDayPage_meals(other, "2026-10-21", false).map((m) => m.meal)).to.deep.equal(["dinner"]);
  });
});

describe("FoodDayPage_build", () => {
  it("labels today and gives the days either side for the switcher", () => {
    const page = FoodDayPage_build(log([]), today, now);
    expect(page.label).to.equal("Today, Oct 22");
    expect(page.isToday).to.equal(true);
    expect(page.previousDay).to.equal("2026-10-21");
    expect(page.nextDay).to.equal("2026-10-23");
  });

  it("totals the day's entries for the summary card", () => {
    const page = FoodDayPage_build(
      log([entry("a", today, "lunch", 500, 30), entry("b", today, "dinner", 300, 10)]),
      today,
      now
    );
    expect(page.totals).to.include({ calories: 800, protein: 40, carbs: 20, fat: 10 });
  });

  it("marks a past day as not today and still lists its four meals", () => {
    const page = FoodDayPage_build(log([]), "2026-10-20", now);
    expect(page.isToday).to.equal(false);
    expect(page.label).to.equal("Tue, Oct 20");
    expect(page.meals).to.have.length(4);
  });
});
