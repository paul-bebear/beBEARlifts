import "mocha";
import { expect } from "chai";
import { SavedFoods_find, SavedFoods_parse, SavedFoods_save, SavedFoods_search } from "../src/models/savedFoods";
import { FoodLog_parse, FoodLog_saveFood, FoodLog_empty } from "../src/models/foodLog";
import { IFoodProduct } from "../src/models/openFoodFacts";

const buldak: IFoodProduct = {
  barcode: "8801073113428",
  name: "Hot Chicken Flavor Ramen",
  brand: "Samyang",
  per100g: { calories: 378.6, protein: 8.6, carbs: 60, fat: 11.4 },
  servingGrams: 140,
};

describe("SavedFoods_find", () => {
  it("matches a UPC-A code against the same code read as EAN-13", () => {
    const saved = [{ ...buldak, barcode: "074603003064" }];
    expect(SavedFoods_find(saved, "0074603003064")?.name).to.equal(buldak.name);
  });

  it("returns nothing for another barcode", () => {
    expect(SavedFoods_find([buldak], "8801073113435")).to.equal(undefined);
  });
});

describe("SavedFoods_save", () => {
  it("replaces the food with the same barcode and puts it first", () => {
    const other: IFoodProduct = { name: "Rice", per100g: { calories: 130, protein: 2.7, carbs: 28, fat: 0.3 } };
    const updated = SavedFoods_save([other, buldak], { ...buldak, name: "Buldak" });
    expect(updated.map((p) => p.name)).to.deep.equal(["Buldak", "Rice"]);
  });

  it("replaces a food without a barcode by its name", () => {
    const rice: IFoodProduct = { name: "Rice", per100g: { calories: 130, protein: 2.7, carbs: 28, fat: 0.3 } };
    const updated = SavedFoods_save([rice, buldak], { ...rice, name: "rice", servingGrams: 200 });
    expect(updated).to.have.length(2);
    expect(updated[0].servingGrams).to.equal(200);
  });
});

describe("SavedFoods_search", () => {
  it("needs every word in the name or brand", () => {
    expect(SavedFoods_search([buldak], "samyang ramen")).to.have.length(1);
    expect(SavedFoods_search([buldak], "samyang udon")).to.have.length(0);
    expect(SavedFoods_search([buldak], "  ")).to.have.length(0);
  });
});

describe("SavedFoods_parse", () => {
  it("keeps valid foods and drops broken ones", () => {
    const parsed = SavedFoods_parse([buldak, { name: "No numbers" }, "junk", { ...buldak, barcode: 5 }]);
    expect(parsed).to.have.length(2);
    expect(parsed[1].barcode).to.equal(undefined);
  });

  it("is empty when the stored log predates saved foods", () => {
    expect(FoodLog_parse({ version: 1, entries: [], recents: [] }).savedFoods).to.deep.equal([]);
  });

  it("survives a round trip through the food log", () => {
    const log = FoodLog_saveFood(FoodLog_empty(), buldak);
    expect(FoodLog_parse(JSON.parse(JSON.stringify(log))).savedFoods).to.deep.equal([buldak]);
  });
});
