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

  it("reads the four core values a label prints, and leaves out the ones it does not print", () => {
    const label = NutritionLabel_parse(
      '{"perServing":{"calories":530,"protein":12,"carbs":84,"fat":16,"fiber":3,"saturatedFat":5.5,"sodiumMg":1210}}'
    );
    expect(label?.perServing.micros).to.deep.equal({ fiber: 3, saturatedFat: 5.5, sodium: 1210 });
    expect(label?.perServing.micros).to.not.have.property("sugar");
  });

  it("gives no micros when the label prints none, and ignores a value that is not a number of 0 or more", () => {
    const none = NutritionLabel_parse('{"perServing":{"calories":530,"protein":12,"carbs":84,"fat":16}}');
    expect(none?.perServing).to.not.have.property("micros");
    const bad = NutritionLabel_parse('{"perServing":{"calories":530,"fiber":-2,"sugar":"lots","sodiumMg":null}}');
    expect(bad?.perServing).to.not.have.property("micros");
  });

  it("scales the micros of a per-100 g label to the serving", () => {
    const label = NutritionLabel_parse(
      '{"servingGrams":40,"per100g":{"calories":370,"protein":13,"carbs":60,"fat":7,"sodiumMg":500,"fiber":8}}'
    );
    expect(label?.perServing.micros).to.deep.equal({ fiber: 3.2, sodium: 200 });
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
      fiber: "",
      sugar: "",
      saturatedFat: "",
      sodium: "",
    });
  });

  it("fills the micro fields from a scanned label and keeps them through the form into per-100 g values", () => {
    const scanned = NutritionLabel_toForm({
      servingGrams: 140,
      perServing: { calories: 530, protein: 12, carbs: 84, fat: 16, micros: { fiber: 3, sodium: 1210 } },
    });
    expect([scanned.fiber, scanned.sugar, scanned.saturatedFat, scanned.sodium]).to.deep.equal(["3", "", "", "1210"]);
    const result = NutritionLabel_toProduct({ ...scanned, name: "Ramen" });
    expect(result.ok && result.product.per100g.micros).to.deep.equal({ fiber: 2.143, sodium: 864.286 });
    if (result.ok) {
      const pick = FoodAddFlow_pickFromProduct(result.product, "barcode");
      expect(FoodAddFlow_nutrientsFor(pick, 140).micros).to.deep.equal({ fiber: 3, sodium: 1210 });
    }
  });

  it("stores no micros when the form fields are empty, so unknown does not become zero", () => {
    const result = NutritionLabel_toProduct(form);
    expect(result.ok && result.product.per100g).to.not.have.property("micros");
  });
});
