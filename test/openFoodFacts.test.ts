import "mocha";
import { expect } from "chai";
import {
  OpenFoodFacts_isBarcode,
  OpenFoodFacts_parseBarcodeResponse,
  OpenFoodFacts_parseSearchResponse,
} from "../src/models/openFoodFacts";

describe("OpenFoodFacts_parseBarcodeResponse", () => {
  it("reads name, brand, serving and per-100g macros", () => {
    const product = OpenFoodFacts_parseBarcodeResponse({
      status: 1,
      product: {
        code: "3017624010701",
        product_name: "Nutella",
        brands: "Ferrero, Nutella",
        serving_quantity: "15",
        nutriments: {
          "energy-kcal_100g": 539,
          "energy-kj_100g": 2228,
          proteins_100g: 6.3,
          carbohydrates_100g: 57.5,
          fat_100g: 30.9,
        },
      },
    });
    expect(product).to.deep.include({
      barcode: "3017624010701",
      name: "Nutella",
      brand: "Ferrero",
      servingGrams: 15,
      per100g: { calories: 539, protein: 6.3, carbs: 57.5, fat: 30.9 },
    });
  });

  it("returns nothing when the product is not found", () => {
    expect(OpenFoodFacts_parseBarcodeResponse({ status: 0, status_verbose: "product not found" })).to.equal(undefined);
  });

  it("returns nothing when the product has no energy value", () => {
    expect(
      OpenFoodFacts_parseBarcodeResponse({ status: 1, product: { product_name: "Water", nutriments: {} } })
    ).to.equal(undefined);
  });

  it("uses kJ when the kcal field holds a kJ number", () => {
    const product = OpenFoodFacts_parseBarcodeResponse({
      status: 1,
      product: { product_name: "Bar", nutriments: { "energy-kcal_100g": 1674, "energy-kj_100g": 1674 } },
    });
    expect(product?.per100g.calories).to.equal(400);
  });
});

describe("OpenFoodFacts_parseSearchResponse", () => {
  it("reads hits with array brands and skips unusable ones", () => {
    const products = OpenFoodFacts_parseSearchResponse({
      hits: [
        {
          code: "1",
          product_name: "Nonfat Greek Yogurt",
          brands: ["Chobani"],
          nutriments: { "energy-kcal_100g": 52.9 },
        },
        { code: "2", nutriments: { "energy-kcal_100g": 100 } },
      ],
    });
    expect(products.map((p) => [p.name, p.brand, p.per100g.calories])).to.deep.equal([
      ["Nonfat Greek Yogurt", "Chobani", 53],
    ]);
  });
});

describe("OpenFoodFacts_isBarcode", () => {
  it("accepts EAN-8 to GTIN-14 digits only", () => {
    expect(OpenFoodFacts_isBarcode("3017624010701")).to.equal(true);
    expect(OpenFoodFacts_isBarcode("1234567")).to.equal(false);
    expect(OpenFoodFacts_isBarcode("greek yogurt")).to.equal(false);
  });
});
