import "mocha";
import { expect } from "chai";
import {
  FoodMicroTotals_emptyOtherDay,
  FoodMicroTotals_emptyToday,
  FoodMicroTotals_forDay,
  FoodMicroTotals_noValueText,
  FoodMicroTotals_visibleRows,
  FoodMicroTotals_warning,
} from "../src/models/foodMicroTotals";
import { FoodLog_empty, IFoodEntry, IFoodLog } from "../src/models/foodLog";
import { IMicros } from "../src/models/foodMicros";

const day = "2026-11-12";

function entry(id: string, micros?: IMicros, overrides: Partial<IFoodEntry> = {}): IFoodEntry {
  return {
    id,
    day,
    meal: "lunch",
    name: id,
    source: "manual",
    nutrients:
      micros != null
        ? { calories: 100, protein: 5, carbs: 10, fat: 4, micros }
        : { calories: 100, protein: 5, carbs: 10, fat: 4 },
    createdAt: 0,
    ...overrides,
  };
}

function log(entries: IFoodEntry[]): IFoodLog {
  return { ...FoodLog_empty(), entries };
}

function row(
  totals: ReturnType<typeof FoodMicroTotals_forDay>,
  key: string
): ReturnType<typeof FoodMicroTotals_forDay>["rows"][number] {
  return totals.rows.find((r) => r.key === key)!;
}

describe("FoodMicroTotals_forDay", () => {
  it("always gives the four core rows, with a dash when no entry has a value", () => {
    const totals = FoodMicroTotals_forDay(log([entry("a"), entry("b")]), day);
    expect(totals.rows.map((r) => r.key)).to.deep.equal(["fiber", "sugar", "saturatedFat", "sodium"]);
    expect(totals.rows.map((r) => r.valueText)).to.deep.equal(Array(4).fill(FoodMicroTotals_noValueText));
    expect(totals.rows.every((r) => r.amount == null && r.foodsWithValue === 0 && r.foods === 2)).to.equal(true);
    expect(totals.hasData).to.equal(false);
  });

  it("sums a micro over the entries that have it and counts them, so unknown is never zero", () => {
    const totals = FoodMicroTotals_forDay(
      log([entry("a", { fiber: 3.2 }), entry("b"), entry("c", { fiber: 1.3 }), entry("d")]),
      day
    );
    const fiber = row(totals, "fiber");
    expect(fiber.amount).to.equal(4.5);
    expect([fiber.foodsWithValue, fiber.foods]).to.deep.equal([2, 4]);
    expect(fiber.valueText).to.equal("4.5 g");
    expect(fiber.coverageText).to.equal("2 of 4 foods");
    expect(row(totals, "sugar").amount).to.equal(undefined);
  });

  it("adds a row for one of the other 18 only when an entry has a value that day, in table order", () => {
    const totals = FoodMicroTotals_forDay(
      log([entry("a", { vitaminC: 12, potassium: 410 }), entry("b", { potassium: 90 })]),
      day
    );
    expect(totals.rows.map((r) => r.key)).to.deep.equal([
      "fiber",
      "sugar",
      "saturatedFat",
      "sodium",
      "potassium",
      "vitaminC",
    ]);
    expect(row(totals, "potassium").valueText).to.equal("500 mg");
    expect(row(totals, "potassium").coverageText).to.equal("2 of 2 foods");
    expect(row(totals, "vitaminC").valueText).to.equal("12 mg");
    expect(row(totals, "vitaminC").coverageText).to.equal("1 of 2 foods");
  });

  it("lists all 22 rows when entries carry every micro", () => {
    const every: IMicros = {};
    for (const key of [
      "fiber",
      "sugar",
      "saturatedFat",
      "sodium",
      "potassium",
      "calcium",
      "iron",
      "magnesium",
      "zinc",
      "phosphorus",
      "cholesterol",
      "vitaminA",
      "vitaminC",
      "vitaminD",
      "vitaminE",
      "vitaminK",
      "thiamin",
      "riboflavin",
      "niacin",
      "vitaminB6",
      "folate",
      "vitaminB12",
    ] as const) {
      every[key] = 1;
    }
    expect(FoodMicroTotals_forDay(log([entry("a", every)]), day).rows).to.have.length(22);
    expect(FoodMicroTotals_visibleRows).to.equal(8);
  });

  it("shows sodium as salt in grams, sodium times 2.5", () => {
    const salt = row(
      FoodMicroTotals_forDay(log([entry("a", { sodium: 487 }), entry("b", { sodium: 513 })]), day),
      "sodium"
    );
    expect(salt.label).to.equal("Salt");
    expect(salt.amount).to.equal(1000);
    expect(salt.valueText).to.equal("2.5 g");
  });

  it("formats grams with one decimal, and small mg and µg with one decimal", () => {
    const totals = FoodMicroTotals_forDay(
      log([entry("a", { saturatedFat: 12.34, iron: 2.71, vitaminB12: 7.5, vitaminA: 193, calcium: 333.4 })]),
      day
    );
    expect(row(totals, "saturatedFat").valueText).to.equal("12.3 g");
    expect(row(totals, "iron").valueText).to.equal("2.7 mg");
    expect(row(totals, "vitaminB12").valueText).to.equal("7.5 µg");
    expect(row(totals, "vitaminA").valueText).to.equal("193 µg");
    expect(row(totals, "calcium").valueText).to.equal("333 mg");
  });

  it("keeps a real zero as a value with its own count", () => {
    const sugar = row(FoodMicroTotals_forDay(log([entry("a", { sugar: 0 }), entry("b")]), day), "sugar");
    expect(sugar.amount).to.equal(0);
    expect(sugar.valueText).to.equal("0 g");
    expect(sugar.coverageText).to.equal("1 of 2 foods");
  });

  it("says 1 of 1 food for a single entry", () => {
    expect(row(FoodMicroTotals_forDay(log([entry("a", { fiber: 1 })]), day), "fiber").coverageText).to.equal(
      "1 of 1 food"
    );
  });

  it("counts only the entries of the day asked for", () => {
    const totals = FoodMicroTotals_forDay(
      log([entry("a", { fiber: 2 }), entry("b", { fiber: 9 }, { day: "2026-11-11" })]),
      day
    );
    expect(row(totals, "fiber").amount).to.equal(2);
    expect(totals.foods).to.equal(1);
  });

  it("shows the fixed estimate warning on every day with an entry, with or without data", () => {
    expect(FoodMicroTotals_warning).to.equal(
      "Estimate only. Many foods have no micro data, so your real totals are likely higher."
    );
    expect(FoodMicroTotals_forDay(log([entry("a")]), day).warning).to.equal(FoodMicroTotals_warning);
    expect(FoodMicroTotals_forDay(log([entry("a", { fiber: 1 })]), day).warning).to.equal(FoodMicroTotals_warning);
    expect(FoodMicroTotals_forDay(log([]), day).warning).to.equal(undefined);
  });

  it("gives the empty line when no entry has data, and none when one has", () => {
    expect(FoodMicroTotals_emptyToday).to.equal("No micro data for today's food yet. Barcodes and the AI fill it in.");
    expect(FoodMicroTotals_forDay(log([entry("a")]), day).emptyText).to.equal(FoodMicroTotals_emptyToday);
    expect(FoodMicroTotals_forDay(log([]), day).emptyText).to.equal(FoodMicroTotals_emptyToday);
    expect(FoodMicroTotals_forDay(log([entry("a", { fiber: 1 })]), day).emptyText).to.equal(undefined);
  });

  it("words the empty line for another day without saying today", () => {
    expect(FoodMicroTotals_forDay(log([entry("a")]), day, "2026-11-13").emptyText).to.equal(
      FoodMicroTotals_emptyOtherDay
    );
    expect(FoodMicroTotals_emptyOtherDay).to.not.contain("today");
  });
});
