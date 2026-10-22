import "mocha";
import { expect } from "chai";
import { FoodLog_empty, IFoodEntry } from "../src/models/foodLog";
import { WeekDots_build } from "../src/models/weekDots";

const at = (year: number, month: number, day: number, hour: number = 12): number =>
  new Date(year, month - 1, day, hour).getTime();

function food(day: string): IFoodEntry {
  return {
    id: day,
    day,
    meal: "lunch",
    name: "Meal",
    source: "manual",
    nutrients: { calories: 0, protein: 0, carbs: 0, fat: 0 },
    createdAt: 0,
  };
}

describe("WeekDots", () => {
  it("returns seven empty dates starting on Sunday by default", () => {
    const dots = WeekDots_build([], FoodLog_empty(), at(2026, 10, 22));
    expect(dots.map((dot) => dot.date)).to.deep.equal([
      "2026-10-18",
      "2026-10-19",
      "2026-10-20",
      "2026-10-21",
      "2026-10-22",
      "2026-10-23",
      "2026-10-24",
    ]);
    expect(dots.every((dot) => !dot.filled)).to.equal(true);
  });

  it("follows the Monday week-start setting", () => {
    const dots = WeekDots_build([], FoodLog_empty(), at(2026, 10, 22), true);
    expect(dots[0].date).to.equal("2026-10-19");
    expect(dots[6].date).to.equal("2026-10-25");
  });

  it("keeps Sunday in the previous Monday-start week", () => {
    const dots = WeekDots_build([], FoodLog_empty(), at(2026, 10, 25), true);
    expect(dots[0].date).to.equal("2026-10-19");
    expect(dots[6].date).to.equal("2026-10-25");
  });

  it("fills days with a workout or a food entry, including zero-calorie food", () => {
    const log = { ...FoodLog_empty(), entries: [food("2026-10-20"), food("2026-10-22")] };
    const history = [{ startTime: at(2026, 10, 19) }, { startTime: at(2026, 10, 22) }];
    const dots = WeekDots_build(history, log, at(2026, 10, 22), true);
    expect(dots.filter((dot) => dot.filled).map((dot) => dot.date)).to.deep.equal([
      "2026-10-19",
      "2026-10-20",
      "2026-10-22",
    ]);
  });

  it("ignores entries outside the week and merges repeated entries", () => {
    const log = {
      ...FoodLog_empty(),
      entries: [food("2026-10-18"), food("2026-10-26"), food("2026-10-22"), food("2026-10-22")],
    };
    const history = [{ startTime: at(2026, 10, 18) }, { startTime: at(2026, 10, 26) }];
    expect(WeekDots_build(history, log, at(2026, 10, 22), true).filter((dot) => dot.filled)).to.deep.equal([
      { date: "2026-10-22", filled: true },
    ]);
  });

  it("uses local workout dates near midnight", () => {
    const dots = WeekDots_build([{ startTime: at(2026, 10, 22, 23) }], FoodLog_empty(), at(2026, 10, 22), true);
    expect(dots.find((dot) => dot.date === "2026-10-22")?.filled).to.equal(true);
    expect(dots.find((dot) => dot.date === "2026-10-23")?.filled).to.equal(false);
  });

  it("crosses the year boundary", () => {
    const dots = WeekDots_build([], FoodLog_empty(), at(2027, 1, 1), true);
    expect(dots[0].date).to.equal("2026-12-28");
    expect(dots[6].date).to.equal("2027-01-03");
  });

  it("keeps seven distinct dates across a daylight-saving transition", () => {
    const dots = WeekDots_build([], FoodLog_empty(), at(2026, 3, 29), true);
    expect(dots.map((dot) => dot.date)).to.deep.equal([
      "2026-03-23",
      "2026-03-24",
      "2026-03-25",
      "2026-03-26",
      "2026-03-27",
      "2026-03-28",
      "2026-03-29",
    ]);
  });
});
