import "mocha";
import { expect } from "chai";
import {
  FoodAddFlow_entriesFromPhoto,
  FoodAddFlow_entryFromPick,
  FoodAddFlow_initialGrams,
  FoodAddFlow_manualPick,
  FoodAddFlow_nutrientsFor,
  FoodAddFlow_parseGrams,
  FoodAddFlow_photoChoices,
  FoodAddFlow_pickFromProduct,
  FoodAddFlow_pickFromRecent,
  FoodAddFlow_setPhotoGrams,
} from "../src/models/foodAddFlow";

const nutella = {
  barcode: "3017624010701",
  name: "Nutella",
  brand: "Ferrero",
  per100g: { calories: 539, protein: 6.3, carbs: 57.5, fat: 30.9 },
  servingGrams: 15,
};

describe("FoodAddFlow picks", () => {
  it("starts a scanned product at one serving", () => {
    const pick = FoodAddFlow_pickFromProduct(nutella, "barcode");
    expect(FoodAddFlow_initialGrams(pick)).to.equal(15);
    expect(FoodAddFlow_nutrientsFor(pick, 15).calories).to.equal(81);
  });

  it("starts a product without a serving size at 100 g", () => {
    const pick = FoodAddFlow_pickFromProduct({ ...nutella, servingGrams: undefined }, "search");
    expect(FoodAddFlow_initialGrams(pick)).to.equal(100);
  });

  it("builds an entry with the barcode and per-100g values kept for later edits", () => {
    const pick = FoodAddFlow_pickFromProduct(nutella, "barcode");
    const entry = FoodAddFlow_entryFromPick(pick, 30, { day: "2026-10-19", meal: "breakfast" }, "id1", 7);
    expect(entry).to.deep.equal({
      id: "id1",
      day: "2026-10-19",
      meal: "breakfast",
      name: "Nutella",
      brand: "Ferrero",
      source: "barcode",
      barcode: "3017624010701",
      grams: 30,
      per100g: nutella.per100g,
      nutrients: { calories: 162, protein: 1.9, carbs: 17.3, fat: 9.3 },
      createdAt: 7,
    });
  });

  it("re-adds a recent photo item at its logged portion and scales it", () => {
    const pick = FoodAddFlow_pickFromRecent({
      name: "Rice",
      source: "photo",
      grams: 200,
      nutrients: { calories: 260, protein: 5, carbs: 56, fat: 0.6 },
    });
    expect(FoodAddFlow_initialGrams(pick)).to.equal(200);
    expect(FoodAddFlow_nutrientsFor(pick, 100)).to.deep.equal({ calories: 130, protein: 2.5, carbs: 28, fat: 0.3 });
  });

  it("stores a quick add without grams", () => {
    const pick = FoodAddFlow_manualPick("  ", { calories: 500, protein: 30, carbs: 50, fat: 15 });
    const entry = FoodAddFlow_entryFromPick(pick, 0, { day: "2026-10-19", meal: "lunch" }, "q", 1);
    expect(entry.name).to.equal("Quick add");
    expect(entry.grams).to.equal(undefined);
    expect(entry.nutrients.calories).to.equal(500);
  });

  it("reads typed grams with a comma or a dot and rejects nonsense", () => {
    expect(FoodAddFlow_parseGrams("12,5")).to.equal(12.5);
    expect(FoodAddFlow_parseGrams("150")).to.equal(150);
    expect(FoodAddFlow_parseGrams("0")).to.equal(undefined);
    expect(FoodAddFlow_parseGrams("abc")).to.equal(undefined);
  });
});

describe("FoodAddFlow photo", () => {
  const items = [
    { name: "Chicken", grams: 150, nutrients: { calories: 248, protein: 46.5, carbs: 0, fat: 5.4 } },
    { name: "Rice", grams: 200, nutrients: { calories: 260, protein: 5, carbs: 56, fat: 0.6 } },
  ];

  it("selects every item at first and scales an item when its grams change", () => {
    const choices = FoodAddFlow_setPhotoGrams(FoodAddFlow_photoChoices(items), 1, 300);
    expect(choices[1]).to.deep.equal({
      name: "Rice",
      grams: 300,
      nutrients: { calories: 390, protein: 7.5, carbs: 84, fat: 0.9 },
      isSelected: true,
    });
  });

  it("keeps calories on the first edit of a suspect amount, then scales", () => {
    const margarita = {
      name: "Margarita",
      grams: 20,
      nutrients: { calories: 240, protein: 0, carbs: 22, fat: 0 },
      isAmountSuspect: true,
    };
    const fixed = FoodAddFlow_setPhotoGrams(FoodAddFlow_photoChoices([margarita]), 0, 240);
    expect(fixed[0]).to.deep.equal({
      name: "Margarita",
      grams: 240,
      nutrients: { calories: 240, protein: 0, carbs: 22, fat: 0 },
      isSelected: true,
    });
    expect(FoodAddFlow_setPhotoGrams(fixed, 0, 480)[0].nutrients.calories).to.equal(480);
  });

  it("logs only the selected items", () => {
    let n = 0;
    const choices = FoodAddFlow_photoChoices(items).map((c, i) => ({ ...c, isSelected: i === 0 }));
    const entries = FoodAddFlow_entriesFromPhoto(
      choices,
      { day: "2026-10-19", meal: "dinner" },
      () => {
        n += 1;
        return `p${n}`;
      },
      1
    );
    expect(entries.map((e) => [e.id, e.name, e.meal, e.source])).to.deep.equal([["p1", "Chicken", "dinner", "photo"]]);
  });
});
