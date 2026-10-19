import "mocha";
import { expect } from "chai";
import { FoodPhotoEstimate_parse } from "../src/models/foodPhotoEstimate";

describe("FoodPhotoEstimate_parse", () => {
  it("reads items from plain JSON", () => {
    const estimate = FoodPhotoEstimate_parse(
      '{"items":[{"name":"Grilled chicken","grams":150,"calories":248,"protein":46.5,"carbs":0,"fat":5.4}]}'
    );
    expect(estimate).to.deep.equal({
      items: [{ name: "Grilled chicken", grams: 150, nutrients: { calories: 248, protein: 46.5, carbs: 0, fat: 5.4 } }],
      note: undefined,
    });
  });

  it("reads JSON wrapped in a code fence with text around it", () => {
    const estimate = FoodPhotoEstimate_parse(
      'Here is my estimate:\n```json\n{"items":[{"name":"Rice","grams":200,"calories":260,"protein":5,"carbs":56,"fat":0.6}],"note":"Sauce not counted"}\n```'
    );
    expect(estimate?.items.map((i) => i.name)).to.deep.equal(["Rice"]);
    expect(estimate?.note).to.equal("Sauce not counted");
  });

  it("drops items without a name, grams or calories", () => {
    const estimate = FoodPhotoEstimate_parse(
      '{"items":[{"name":"","grams":10,"calories":1},{"name":"Egg","grams":0,"calories":70},{"name":"Toast","grams":30,"calories":80}]}'
    );
    expect(estimate?.items.map((i) => i.name)).to.deep.equal(["Toast"]);
  });

  it("keeps a note when no food was found", () => {
    expect(FoodPhotoEstimate_parse('{"items":[],"note":"No food in the photo"}')).to.deep.equal({
      items: [],
      note: "No food in the photo",
    });
  });

  it("returns nothing for text that is not JSON", () => {
    expect(FoodPhotoEstimate_parse("I cannot help with that")).to.equal(undefined);
  });
});
