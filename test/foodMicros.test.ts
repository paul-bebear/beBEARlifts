import "mocha";
import { expect } from "chai";
import {
  FoodMicros_fromCoreFields,
  FoodMicros_fromGrams,
  FoodMicros_saltPerSodium,
  FoodMicros_sodiumFromSalt,
  FoodMicros_coreKeys,
  FoodMicros_isKey,
  FoodMicros_keys,
  FoodMicros_row,
  FoodMicros_table,
} from "../src/models/foodMicros";

describe("FoodMicros_table", () => {
  it("has 22 rows with unique keys, Open Food Facts fields and USDA numbers", () => {
    expect(FoodMicros_table).to.have.length(22);
    expect(new Set(FoodMicros_table.map((r) => r.key)).size).to.equal(22);
    expect(new Set(FoodMicros_table.map((r) => r.openFoodFacts)).size).to.equal(22);
    expect(new Set(FoodMicros_table.map((r) => r.usda)).size).to.equal(22);
  });

  it("puts the four core micros first, in label order", () => {
    expect(FoodMicros_coreKeys).to.deep.equal(["fiber", "sugar", "saturatedFat", "sodium"]);
    expect(FoodMicros_keys.slice(0, 4)).to.deep.equal(FoodMicros_coreKeys);
    expect(FoodMicros_table.slice(4).every((r) => !r.isCore)).to.equal(true);
  });

  it("uses the units the owner's plan names", () => {
    const units = Object.fromEntries(FoodMicros_table.map((r) => [r.key, r.unit]));
    expect(units).to.deep.equal({
      fiber: "g",
      sugar: "g",
      saturatedFat: "g",
      sodium: "mg",
      potassium: "mg",
      calcium: "mg",
      iron: "mg",
      magnesium: "mg",
      zinc: "mg",
      phosphorus: "mg",
      cholesterol: "mg",
      vitaminA: "µg",
      vitaminC: "mg",
      vitaminD: "µg",
      vitaminE: "mg",
      vitaminK: "µg",
      thiamin: "mg",
      riboflavin: "mg",
      niacin: "mg",
      vitaminB6: "mg",
      folate: "µg",
      vitaminB12: "µg",
    });
  });

  it("keeps the field names and numbers checked against live Open Food Facts and USDA responses on 2026-11-12", () => {
    const fields = Object.fromEntries(FoodMicros_table.map((r) => [r.key, [r.openFoodFacts, r.usda]]));
    expect(fields).to.deep.equal({
      fiber: ["fiber", "291"],
      sugar: ["sugars", "269"],
      saturatedFat: ["saturated-fat", "606"],
      sodium: ["sodium", "307"],
      potassium: ["potassium", "306"],
      calcium: ["calcium", "301"],
      iron: ["iron", "303"],
      magnesium: ["magnesium", "304"],
      zinc: ["zinc", "309"],
      phosphorus: ["phosphorus", "305"],
      cholesterol: ["cholesterol", "601"],
      vitaminA: ["vitamin-a", "320"],
      vitaminC: ["vitamin-c", "401"],
      vitaminD: ["vitamin-d", "328"],
      vitaminE: ["vitamin-e", "323"],
      vitaminK: ["vitamin-k", "430"],
      thiamin: ["vitamin-b1", "404"],
      riboflavin: ["vitamin-b2", "405"],
      niacin: ["vitamin-pp", "406"],
      vitaminB6: ["vitamin-b6", "415"],
      folate: ["vitamin-b9", "417"],
      vitaminB12: ["vitamin-b12", "418"],
    });
  });

  it("finds a row by key and tells table keys from other text", () => {
    expect(FoodMicros_row("sodium").unit).to.equal("mg");
    expect(FoodMicros_isKey("vitaminB12")).to.equal(true);
    expect(FoodMicros_isKey("sodiumMg")).to.equal(false);
    expect(FoodMicros_isKey("__proto__")).to.equal(false);
  });
});

describe("FoodMicros conversions", () => {
  it("converts grams to the row's unit and rounds to three decimals", () => {
    expect(FoodMicros_fromGrams("g", 3.4)).to.equal(3.4);
    expect(FoodMicros_fromGrams("mg", 0.00125)).to.equal(1.25);
    expect(FoodMicros_fromGrams("µg", 0.0000021)).to.equal(2.1);
  });

  it("gives sodium from salt as salt divided by 2.5", () => {
    expect(FoodMicros_saltPerSodium).to.equal(2.5);
    expect(FoodMicros_sodiumFromSalt(1.25)).to.equal(0.5);
  });

  it("reads the four core fields of a label or an AI answer, with sodium from sodiumMg", () => {
    expect(FoodMicros_fromCoreFields({ fiber: 3, sugar: "4.5", saturatedFat: 0, sodiumMg: 1210 })).to.deep.equal({
      fiber: 3,
      sugar: 4.5,
      saturatedFat: 0,
      sodium: 1210,
    });
  });

  it("leaves a field out when it is missing, negative, not a number or not finite", () => {
    expect(FoodMicros_fromCoreFields({ fiber: 2, sugar: -1, saturatedFat: "lots", sodiumMg: Infinity })).to.deep.equal({
      fiber: 2,
    });
    expect(FoodMicros_fromCoreFields({ sodium: 500, calories: 90 })).to.equal(undefined);
    expect(FoodMicros_fromCoreFields({ fiber: "", sugar: null })).to.equal(undefined);
  });
});
