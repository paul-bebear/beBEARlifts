import "mocha";
import { expect } from "chai";
import type { INutrients } from "../src/models/foodLog";
import {
  OpenFoodFacts_firstBarcode,
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

  it("falls back to an English, then any localized name when product_name is empty", () => {
    const english = OpenFoodFacts_parseBarcodeResponse({
      status: 1,
      product: { product_name: "", product_name_en: "Buldak ramen", nutriments: { "energy-kcal_100g": 380 } },
    });
    expect(english?.name).to.equal("Buldak ramen");
    const korean = OpenFoodFacts_parseBarcodeResponse({
      status: 1,
      product: { product_name: "", product_name_ko: "불닭볶음면", nutriments: { "energy-kcal_100g": 380 } },
    });
    expect(korean?.name).to.equal("불닭볶음면");
  });

  it("converts per-serving nutrition to per 100 g using the serving size text", () => {
    const product = OpenFoodFacts_parseBarcodeResponse({
      status: 1,
      product: {
        product_name: "Hot Chicken Flavor Ramen",
        serving_size: "1 pack (140 g)",
        nutriments: {
          "energy-kcal_serving": 530,
          proteins_serving: 12,
          carbohydrates_serving: 84,
          fat_serving: 16,
        },
      },
    });
    expect(product).to.deep.include({
      servingGrams: 140,
      per100g: { calories: 379, protein: 8.6, carbs: 60, fat: 11.4 },
    });
  });

  it("returns nothing for per-serving nutrition when the serving has no gram weight", () => {
    const product = OpenFoodFacts_parseBarcodeResponse({
      status: 1,
      product: { product_name: "Ramen", serving_size: "1 pack", nutriments: { "energy-kcal_serving": 530 } },
    });
    expect(product).to.equal(undefined);
  });

  it("does not read a kilogram weight as grams", () => {
    const product = OpenFoodFacts_parseBarcodeResponse({
      status: 1,
      product: { product_name: "Rice", serving_size: "1kg", nutriments: { "energy-kcal_100g": 360 } },
    });
    expect(product?.servingGrams).to.equal(undefined);
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

describe("OpenFoodFacts micros", () => {
  function parse(nutriments: Record<string, unknown>, extra: Record<string, unknown> = {}): INutrients | undefined {
    return OpenFoodFacts_parseBarcodeResponse({
      status: 1,
      product: { code: "1", product_name: "Cereal", nutriments: { "energy-kcal_100g": 380, ...nutriments }, ...extra },
    })?.per100g;
  }

  it("converts grams to the unit of each row: mg times 1,000 and µg times 1,000,000", () => {
    const per100g = parse({
      fiber_100g: 3.4,
      sugars_100g: 56.3,
      "saturated-fat_100g": 10.6,
      sodium_100g: 0.041,
      potassium_100g: 0.4,
      "vitamin-a_100g": 0.00006,
      "vitamin-b12_100g": 0.0000021,
      "vitamin-pp_100g": 0.0133,
    });
    expect(per100g?.micros).to.deep.equal({
      fiber: 3.4,
      sugar: 56.3,
      saturatedFat: 10.6,
      sodium: 41,
      potassium: 400,
      vitaminA: 60,
      vitaminB12: 2.1,
      niacin: 13.3,
    });
  });

  it("leaves a missing micro out, so it stays unknown and is not zero", () => {
    const per100g = parse({ fiber_100g: 3.4 });
    expect(per100g?.micros).to.deep.equal({ fiber: 3.4 });
    expect(per100g?.micros).to.not.have.property("sugar");
    expect(parse({})).to.not.have.property("micros");
  });

  it("keeps a printed zero as a value", () => {
    expect(parse({ sugars_100g: 0 })?.micros).to.deep.equal({ sugar: 0 });
  });

  it("uses salt divided by 2.5 only when sodium is missing", () => {
    expect(parse({ salt_100g: 1.25 })?.micros).to.deep.equal({ sodium: 500 });
    expect(parse({ salt_100g: 1.25, sodium_100g: 0.3 })?.micros).to.deep.equal({ sodium: 300 });
  });

  it("converts per-serving values to per 100 g with the serving size", () => {
    const per100g = parse(
      { "energy-kcal_serving": 190, fiber_serving: 2, potassium_serving: 0.1 },
      { serving_quantity: "50", nutriments: { "energy-kcal_serving": 190, fiber_serving: 2, potassium_serving: 0.1 } }
    );
    expect(per100g?.micros).to.deep.equal({ fiber: 4, potassium: 200 });
  });

  it("ignores a negative or non-numeric value", () => {
    expect(parse({ fiber_100g: -1, sugars_100g: "n/a", iron_100g: "0.002" })?.micros).to.deep.equal({ iron: 2 });
  });
});

describe("OpenFoodFacts_firstBarcode", () => {
  it("returns the first scanned value that is a product barcode", () => {
    expect(OpenFoodFacts_firstBarcode([undefined, "https://example.com", " 0012345678905 ", "3017624010701"])).to.equal(
      "0012345678905"
    );
    expect(OpenFoodFacts_firstBarcode([undefined, "ABC-123"])).to.equal(undefined);
    expect(OpenFoodFacts_firstBarcode([])).to.equal(undefined);
  });
});
