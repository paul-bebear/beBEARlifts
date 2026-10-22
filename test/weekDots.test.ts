import "mocha";
import { expect } from "chai";
import { WeekDots_build } from "../src/models/weekDots";
import { FoodLog_empty, IFoodEntry } from "../src/models/foodLog";

const at = (day: string, hour: number = 8): number => {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(y, m - 1, d, hour).getTime();
};

function food(day: string): IFoodEntry {
  return {
    id: day,
    day,
    meal: "lunch",
    name: "Rice",
    source: "manual",
    nutrients: { calories: 500, protein: 0, carbs: 0, fat: 0 },
    createdAt: at(day),
  };
}

describe("WeekDots", () => {
  it("returns seven days from Sunday when the week starts on Sunday", () => {
    const dots = WeekDots_build({ history: [], foodLog: FoodLog_empty(), now: at("2026-10-22") });
    expect(dots.map((d) => d.day)).to.deep.equal([
      "2026-10-18",
      "2026-10-19",
      "2026-10-20",
      "2026-10-21",
      "2026-10-22",
      "2026-10-23",
      "2026-10-24",
    ]);
    expect(dots.filter((d) => d.isToday).map((d) => d.day)).to.deep.equal(["2026-10-22"]);
    expect(dots.every((d) => !d.filled)).to.equal(true);
  });

  it("starts on Monday when the setting says so, also on a Sunday", () => {
    const thursday = WeekDots_build({
      history: [],
      foodLog: FoodLog_empty(),
      now: at("2026-10-22"),
      startWeekFromMonday: true,
    });
    expect(thursday[0].day).to.equal("2026-10-19");
    expect(thursday[6].day).to.equal("2026-10-25");
    const sunday = WeekDots_build({
      history: [],
      foodLog: FoodLog_empty(),
      now: at("2026-10-25"),
      startWeekFromMonday: true,
    });
    expect(sunday[0].day).to.equal("2026-10-19");
    expect(sunday[6]).to.deep.equal({ day: "2026-10-25", filled: false, isToday: true });
  });

  it("fills a day that has a workout or a food entry", () => {
    const foodLog = { ...FoodLog_empty(), entries: [food("2026-10-20"), food("2026-10-12")] };
    const dots = WeekDots_build({
      history: [{ startTime: at("2026-10-19", 18) }, { startTime: at("2026-10-11") }],
      foodLog,
      now: at("2026-10-22"),
      startWeekFromMonday: true,
    });
    expect(dots.map((d) => d.filled)).to.deep.equal([true, true, false, false, false, false, false]);
  });

  it("keeps days from the shifted week across the end of a month", () => {
    const dots = WeekDots_build({
      history: [],
      foodLog: FoodLog_empty(),
      now: at("2026-11-01"),
      startWeekFromMonday: true,
    });
    expect(dots[0].day).to.equal("2026-10-26");
    expect(dots[6].day).to.equal("2026-11-01");
  });
});
