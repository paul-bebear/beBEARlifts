import "mocha";
import { expect } from "chai";
import { UsdaFoodData_parseBarcodeResponse } from "../src/models/usdaFoodData";

function food(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    fdcId: 2071234,
    dataType: "Branded",
    description: "HOT CHICKEN FLAVOR RAMEN",
    brandOwner: "SAMYANG FOODS CO., LTD.",
    brandName: "SAMYANG",
    gtinUpc: "008801073113428",
    servingSize: 140,
    servingSizeUnit: "GRM",
    foodNutrients: [
      { nutrientId: 1008, nutrientNumber: "208", nutrientName: "Energy", unitName: "KCAL", value: 379 },
      { nutrientId: 1003, nutrientNumber: "203", nutrientName: "Protein", unitName: "G", value: 8.57 },
      { nutrientId: 1004, nutrientNumber: "204", nutrientName: "Total lipid (fat)", unitName: "G", value: 11.4 },
      { nutrientId: 1005, nutrientNumber: "205", nutrientName: "Carbohydrate", unitName: "G", value: 60 },
    ],
    ...overrides,
  };
}

describe("UsdaFoodData_parseBarcodeResponse", () => {
  it("reads the food whose GTIN matches, ignoring leading zeros", () => {
    const product = UsdaFoodData_parseBarcodeResponse({ foods: [food()] }, "8801073113428");
    expect(product).to.deep.equal({
      barcode: "8801073113428",
      name: "Hot Chicken Flavor Ramen",
      brand: "Samyang",
      servingGrams: 140,
      per100g: { calories: 379, protein: 8.6, carbs: 60, fat: 11.4 },
    });
  });

  it("skips a search hit with another GTIN", () => {
    const foods = [food({ gtinUpc: "008801073113435", description: "OTHER" }), food()];
    expect(UsdaFoodData_parseBarcodeResponse({ foods }, "8801073113428")?.name).to.equal("Hot Chicken Flavor Ramen");
    expect(UsdaFoodData_parseBarcodeResponse({ foods: [foods[0]] }, "8801073113428")).to.equal(undefined);
  });

  it("converts kJ when there is no kcal value", () => {
    const foodNutrients = [{ nutrientNumber: "268", unitName: "KJ", value: 1674 }];
    expect(
      UsdaFoodData_parseBarcodeResponse({ foods: [food({ foodNutrients })] }, "8801073113428")?.per100g
    ).to.deep.equal({ calories: 400, protein: 0, carbs: 0, fat: 0 });
  });

  it("keeps mixed-case names and drops a serving in a unit that is not grams", () => {
    const product = UsdaFoodData_parseBarcodeResponse(
      { foods: [food({ description: "Shin Ramyun", servingSize: 1, servingSizeUnit: "ONZ" })] },
      "8801073113428"
    );
    expect(product?.name).to.equal("Shin Ramyun");
    expect(product?.servingGrams).to.equal(undefined);
  });

  it("reads the micros a branded food reports, in the units USDA names", () => {
    const foodNutrients = [
      { nutrientNumber: "208", unitName: "KCAL", value: 379 },
      { nutrientNumber: "291", unitName: "G", value: 10.3 },
      { nutrientNumber: "269", unitName: "G", value: 5.13 },
      { nutrientNumber: "606", unitName: "G", value: 1.28 },
      { nutrientNumber: "307", unitName: "MG", value: 487 },
      { nutrientNumber: "306", unitName: "MG", value: 641 },
      { nutrientNumber: "320", unitName: "UG", value: 193 },
      { nutrientNumber: "417", unitName: "UG", value: 500 },
      { nutrientNumber: "418", unitName: "UG", value: 7.5 },
    ];
    const product = UsdaFoodData_parseBarcodeResponse({ foods: [food({ foodNutrients })] }, "8801073113428");
    expect(product?.per100g.micros).to.deep.equal({
      fiber: 10.3,
      sugar: 5.13,
      saturatedFat: 1.28,
      sodium: 487,
      potassium: 641,
      vitaminA: 193,
      folate: 500,
      vitaminB12: 7.5,
    });
  });

  it("leaves a micro the food does not report out, and keeps a reported zero", () => {
    const foodNutrients = [
      { nutrientNumber: "208", unitName: "KCAL", value: 379 },
      { nutrientNumber: "601", unitName: "MG", value: 0 },
    ];
    const product = UsdaFoodData_parseBarcodeResponse({ foods: [food({ foodNutrients })] }, "8801073113428");
    expect(product?.per100g.micros).to.deep.equal({ cholesterol: 0 });
    const bare = UsdaFoodData_parseBarcodeResponse(
      { foods: [food({ foodNutrients: [{ nutrientNumber: "208", unitName: "KCAL", value: 379 }] })] },
      "8801073113428"
    );
    expect(bare?.per100g).to.not.have.property("micros");
  });

  it("does not use the IU values of vitamin A and D, which are not the µg rows", () => {
    const foodNutrients = [
      { nutrientNumber: "208", unitName: "KCAL", value: 379 },
      { nutrientNumber: "318", unitName: "IU", value: 3750 },
      { nutrientNumber: "324", unitName: "IU", value: 205 },
    ];
    const product = UsdaFoodData_parseBarcodeResponse({ foods: [food({ foodNutrients })] }, "8801073113428");
    expect(product?.per100g).to.not.have.property("micros");
  });

  it("returns nothing for a food without energy or a broken response", () => {
    expect(UsdaFoodData_parseBarcodeResponse({ foods: [food({ foodNutrients: [] })] }, "8801073113428")).to.equal(
      undefined
    );
    expect(UsdaFoodData_parseBarcodeResponse({ error: "x" }, "8801073113428")).to.equal(undefined);
    expect(UsdaFoodData_parseBarcodeResponse(undefined, "8801073113428")).to.equal(undefined);
  });
});
