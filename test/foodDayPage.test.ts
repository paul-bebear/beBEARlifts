import "mocha";
import { expect } from "chai";
import {
  FoodDayPage_build,
  FoodDayPage_meals,
  FoodDayPage_pillText,
  RecipePhoto_failed,
  RecipePhoto_initial,
  RecipePhoto_shouldDownload,
  RecipePhoto_showsPlaceholder,
} from "../src/models/foodDayPage";
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
    expect(page.previousDay).to.equal("2026-10-21");
    expect(page.nextDay).to.equal("2026-10-23");
  });

  it("carries the day's micro totals, worded for today or for another day", () => {
    const withFiber = log([
      {
        ...entry("a", today, "lunch", 500, 30),
        nutrients: { calories: 500, protein: 30, carbs: 10, fat: 5, micros: { fiber: 4 } },
      },
      entry("b", today, "dinner", 300, 10),
    ]);
    const page = FoodDayPage_build(withFiber, today, now);
    expect(page.micros.rows.find((r) => r.key === "fiber")?.coverageText).to.equal("1 of 2 foods");
    expect(page.micros.hasData).to.equal(true);
    const empty = FoodDayPage_build(log([]), today, now);
    expect(empty.micros.emptyText).to.contain("today's");
    expect(FoodDayPage_build(log([]), "2026-10-20", now).micros.emptyText).to.not.contain("today");
  });

  it("labels a past day by its weekday", () => {
    expect(FoodDayPage_build(log([]), "2026-10-20", now).label).to.equal("Tue, Oct 20");
  });

  it("returns only what the screen reads", () => {
    expect(Object.keys(FoodDayPage_build(log([]), today, now)).sort()).to.deep.equal([
      "day",
      "label",
      "micros",
      "nextDay",
      "previousDay",
    ]);
  });
});

describe("FoodDayPage_pillText", () => {
  it("rounds each number and groups the calories", () => {
    expect(FoodDayPage_pillText({ calories: 1234.6, protein: 99.5, carbs: 10.4, fat: 4.5 })).to.equal(
      "🔥 1,235 · C 10 · P 100 · F 5"
    );
  });

  it("shows zeros for an empty day", () => {
    expect(FoodDayPage_pillText({ calories: 0, protein: 0, carbs: 0, fat: 0 })).to.equal("🔥 0 · C 0 · P 0 · F 0");
  });
});

describe("RecipePhoto state", () => {
  const remote = "https://x.test/a.jpg";
  const cached = "file:///cache/a.jpg";

  it("starts from the cache uri, or with no source when the recipe has no photo", () => {
    expect(RecipePhoto_initial(remote, () => cached)).to.deep.equal({ src: cached, isError: false });
    expect(RecipePhoto_initial(undefined, () => cached)).to.deep.equal({ src: undefined, isError: false });
  });

  it("falls back to the remote url once, then to the placeholder", () => {
    const first = RecipePhoto_failed({ src: cached, isError: false }, remote);
    expect(first).to.deep.equal({ state: { src: remote, isError: false }, marksMissing: true });
    const second = RecipePhoto_failed(first.state, remote);
    expect(second).to.deep.equal({ state: { src: remote, isError: true }, marksMissing: false });
    expect(RecipePhoto_showsPlaceholder(second.state, remote)).to.equal(true);
    expect(RecipePhoto_showsPlaceholder(first.state, remote)).to.equal(false);
  });

  it("downloads only after the remote copy loaded", () => {
    expect(RecipePhoto_shouldDownload({ src: remote, isError: false }, remote)).to.equal(true);
    expect(RecipePhoto_shouldDownload({ src: cached, isError: false }, remote)).to.equal(false);
  });

  it("shows the placeholder without a remote url or a source", () => {
    expect(RecipePhoto_showsPlaceholder({ src: cached, isError: false }, undefined)).to.equal(true);
    expect(RecipePhoto_showsPlaceholder({ src: undefined, isError: false }, remote)).to.equal(true);
  });
});
