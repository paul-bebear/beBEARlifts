import "mocha";
import { expect } from "chai";
import {
  FoodLog_add,
  FoodLog_copyDay,
  FoodLog_dayLabel,
  FoodLog_dayTotals,
  FoodLog_defaultGoals,
  FoodLog_empty,
  FoodLog_entriesFor,
  FoodLog_formatRange,
  FoodLog_mealForHour,
  FoodLog_parse,
  FoodLog_progress,
  FoodLog_remove,
  FoodLog_scale,
  FoodLog_setGrams,
  FoodLog_shiftDay,
  IFoodEntry,
} from "../src/models/foodLog";

function entry(overrides: Partial<IFoodEntry>): IFoodEntry {
  return {
    id: "a",
    day: "2026-10-19",
    meal: "breakfast",
    name: "Oats",
    source: "search",
    grams: 100,
    per100g: { calories: 380, protein: 13, carbs: 60, fat: 7 },
    nutrients: { calories: 380, protein: 13, carbs: 60, fat: 7 },
    createdAt: 0,
    ...overrides,
  };
}

describe("FoodLog days", () => {
  it("labels today, yesterday and tomorrow, and other days by weekday", () => {
    expect(FoodLog_dayLabel("2026-10-19", "2026-10-19")).to.equal("Today, Oct 19");
    expect(FoodLog_dayLabel("2026-10-18", "2026-10-19")).to.equal("Yesterday, Oct 18");
    expect(FoodLog_dayLabel("2026-10-20", "2026-10-19")).to.equal("Tomorrow, Oct 20");
    expect(FoodLog_dayLabel("2026-10-13", "2026-10-19")).to.equal("Tue, Oct 13");
  });

  it("shifts across month and year ends", () => {
    expect(FoodLog_shiftDay("2026-10-31", 1)).to.equal("2026-11-01");
    expect(FoodLog_shiftDay("2027-01-01", -1)).to.equal("2026-12-31");
  });

  it("picks a meal from the hour", () => {
    expect(FoodLog_mealForHour(8)).to.equal("breakfast");
    expect(FoodLog_mealForHour(13)).to.equal("lunch");
    expect(FoodLog_mealForHour(20)).to.equal("dinner");
    expect(FoodLog_mealForHour(16)).to.equal("snacks");
    expect(FoodLog_mealForHour(2)).to.equal("snacks");
  });
});

describe("FoodLog totals", () => {
  it("scales per-100g values to the eaten amount", () => {
    expect(FoodLog_scale({ calories: 539, protein: 6.3, carbs: 57.5, fat: 30.9 }, 15)).to.deep.equal({
      calories: 81,
      protein: 0.9,
      carbs: 8.6,
      fat: 4.6,
    });
  });

  it("sums one day only", () => {
    let log = FoodLog_add(FoodLog_empty(), entry({ id: "a" }));
    log = FoodLog_add(log, entry({ id: "b", meal: "lunch" }));
    log = FoodLog_add(log, entry({ id: "c", day: "2026-10-18" }));
    expect(FoodLog_dayTotals(log, "2026-10-19")).to.deep.equal({ calories: 760, protein: 26, carbs: 120, fat: 14 });
    expect(FoodLog_entriesFor(log, "2026-10-19", "lunch").map((e) => e.id)).to.deep.equal(["b"]);
  });

  it("recomputes nutrients when the grams change", () => {
    const log = FoodLog_setGrams(FoodLog_add(FoodLog_empty(), entry({})), "a", 50);
    expect(log.entries[0].nutrients).to.deep.equal({ calories: 190, protein: 6.5, carbs: 30, fat: 3.5 });
  });

  it("scales a photo entry without per-100g values by the ratio of grams", () => {
    const photo = entry({
      per100g: undefined,
      grams: 200,
      nutrients: { calories: 400, protein: 30, carbs: 40, fat: 10 },
    });
    const log = FoodLog_setGrams(FoodLog_add(FoodLog_empty(), photo), "a", 300);
    expect(log.entries[0].nutrients).to.deep.equal({ calories: 600, protein: 45, carbs: 60, fat: 15 });
  });

  it("removes an entry", () => {
    const log = FoodLog_remove(FoodLog_add(FoodLog_empty(), entry({})), "a");
    expect(log.entries).to.have.length(0);
  });
});

describe("FoodLog recents", () => {
  it("keeps one recent per barcode, newest first", () => {
    let log = FoodLog_add(FoodLog_empty(), entry({ id: "a", barcode: "123", name: "Milk" }));
    log = FoodLog_add(log, entry({ id: "b", name: "Oats" }));
    log = FoodLog_add(log, entry({ id: "c", barcode: "123", name: "Milk" }));
    expect(log.recents.map((r) => r.name)).to.deep.equal(["Milk", "Oats"]);
  });
});

describe("FoodLog_copyDay", () => {
  it("copies every entry of one day to another with new ids", () => {
    let n = 0;
    const log = FoodLog_add(FoodLog_empty(), entry({ id: "a", day: "2026-10-18" }));
    const copied = FoodLog_copyDay(
      log,
      "2026-10-18",
      "2026-10-19",
      () => {
        n += 1;
        return `new${n}`;
      },
      5
    );
    expect(FoodLog_entriesFor(copied, "2026-10-19").map((e) => [e.id, e.createdAt])).to.deep.equal([["new1", 5]]);
    expect(FoodLog_entriesFor(copied, "2026-10-18")).to.have.length(1);
  });
});

describe("FoodLog_progress", () => {
  const range = { min: 3100, max: 3200 };

  it("shows consumed calories against the top of the range", () => {
    const p = FoodLog_progress(742, range, "consumed");
    expect(p.value).to.equal(742);
    expect(p.fraction).to.be.closeTo(0.232, 0.001);
    expect(p.isOver).to.equal(false);
  });

  it("shows what is left to reach the bottom of the range, never below zero", () => {
    expect(FoodLog_progress(742, range, "remaining").value).to.equal(2358);
    expect(FoodLog_progress(3300, range, "remaining").value).to.equal(0);
    expect(FoodLog_progress(3300, range, "remaining").isOver).to.equal(true);
  });

  it("formats a range and a single target", () => {
    expect(FoodLog_formatRange({ min: 109, max: 185 }, "g")).to.equal("109-185g");
    expect(FoodLog_formatRange({ min: 150, max: 150 }, "g")).to.equal("150g");
  });
});

describe("FoodLog_parse", () => {
  it("returns an empty log for missing or broken data", () => {
    expect(FoodLog_parse(undefined)).to.deep.equal(FoodLog_empty());
    expect(FoodLog_parse("nonsense")).to.deep.equal(FoodLog_empty());
  });

  it("drops broken entries and replaces broken goals with defaults", () => {
    const log = FoodLog_parse({
      entries: [entry({}), { id: "x", name: "No nutrients" }],
      goals: { calories: { min: 2000, max: 1000 }, protein: { min: 150, max: 160 } },
    });
    expect(log.entries.map((e) => e.id)).to.deep.equal(["a"]);
    expect(log.goals.calories).to.deep.equal(FoodLog_defaultGoals.calories);
    expect(log.goals.protein).to.deep.equal({ min: 150, max: 160 });
  });

  it("round-trips through JSON", () => {
    const log = FoodLog_add(FoodLog_empty(), entry({ barcode: "3017624010701" }));
    expect(FoodLog_parse(JSON.parse(JSON.stringify(log)))).to.deep.equal(log);
  });
});
