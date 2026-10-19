import "mocha";
import { expect } from "chai";
import {
  NutritionLabel_note,
  NutritionLabel_parse,
  NutritionLabel_toForm,
  NutritionLabel_toProduct,
} from "../src/models/nutritionLabel";
import { FoodAddFlow_nutrientsFor, FoodAddFlow_pickFromProduct } from "../src/models/foodAddFlow";

describe("NutritionLabel_parse", () => {
  it("reads a per-serving label inside a code fence", () => {
    const label = NutritionLabel_parse(
      '```json\n{"name":"Hot Chicken Flavor Ramen","brand":"Samyang","servingGrams":140,' +
        '"perServing":{"calories":530,"protein":12,"carbs":84,"fat":16}}\n```'
    );
    expect(label).to.deep.include({
      name: "Hot Chicken Flavor Ramen",
      brand: "Samyang",
      servingGrams: 140,
      perServing: { calories: 530, protein: 12, carbs: 84, fat: 16 },
    });
  });

  it("turns a per-100 g label into a serving of the stated size", () => {
    const label = NutritionLabel_parse(
      '{"name":"Oats","servingGrams":40,"per100g":{"calories":370,"protein":13,"carbs":60,"fat":7}}'
    );
    expect(label?.servingGrams).to.equal(40);
    expect(label?.perServing).to.deep.equal({ calories: 148, protein: 5.2, carbs: 24, fat: 2.8 });
  });

  it("uses 100 g as the serving when a per-100 g label states none", () => {
    const label = NutritionLabel_parse('{"per100g":{"calories":370}}');
    expect(label?.servingGrams).to.equal(100);
    expect(label?.perServing.calories).to.equal(370);
  });

  it("returns nothing when there is no label, and keeps the reason", () => {
    const text = '{"note":"The photo shows a plate, not a label."}';
    expect(NutritionLabel_parse(text)).to.equal(undefined);
    expect(NutritionLabel_note(text)).to.equal("The photo shows a plate, not a label.");
  });
});

describe("NutritionLabel_toProduct", () => {
  const form = NutritionLabel_toForm({
    name: "Hot Chicken Flavor Ramen",
    brand: "Samyang",
    servingGrams: 140,
    perServing: { calories: 530, protein: 12, carbs: 84, fat: 16 },
  });

  it("scales back to the label's own numbers for one serving", () => {
    const result = NutritionLabel_toProduct(form, "8801073113428");
    expect(result.ok).to.equal(true);
    if (result.ok) {
      expect(result.product).to.deep.include({ barcode: "8801073113428", brand: "Samyang", servingGrams: 140 });
      const pick = FoodAddFlow_pickFromProduct(result.product, "barcode");
      expect(FoodAddFlow_nutrientsFor(pick, 140)).to.deep.equal({ calories: 530, protein: 12, carbs: 84, fat: 16 });
    }
  });

  it("accepts a comma decimal and empty macros", () => {
    const result = NutritionLabel_toProduct({ ...form, calories: "120,5", protein: "", carbs: "", fat: "" });
    expect(result.ok && result.product.per100g.calories).to.equal(86.1);
    expect(result.ok && result.product.per100g.protein).to.equal(0);
  });

  it("asks for a name, a serving weight and calories", () => {
    expect(NutritionLabel_toProduct({ ...form, name: " " })).to.deep.equal({
      ok: false,
      error: "Give the food a name.",
    });
    expect(NutritionLabel_toProduct({ ...form, servingGrams: "0" }).ok).to.equal(false);
    expect(NutritionLabel_toProduct({ ...form, calories: "" }).ok).to.equal(false);
  });

  it("starts an empty form for typing it in", () => {
    expect(NutritionLabel_toForm(undefined)).to.deep.equal({
      name: "",
      brand: "",
      servingGrams: "",
      calories: "",
      protein: "",
      carbs: "",
      fat: "",
    });
  });
});
