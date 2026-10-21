import "mocha";
import { expect } from "chai";
import {
  FoodPhotoEstimate_cutOffNote,
  FoodPhotoEstimate_failure,
  FoodPhotoEstimate_parse,
} from "../src/models/foodPhotoEstimate";

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

  it("keeps the whole items of an answer that was cut off", () => {
    const estimate = FoodPhotoEstimate_parse(
      '{"items":[{"name":"Montadito","grams":420,"calories":1050,"protein":42,"carbs":120,"fat":44},' +
        '{"name":"Potato chips","grams":60,"calories":320,"protein":4,"carbs":32,"fat":20},{"name":"Bee'
    );
    expect(estimate?.items.map((i) => i.name)).to.deep.equal(["Montadito", "Potato chips"]);
    expect(estimate?.note).to.equal(FoodPhotoEstimate_cutOffNote);
  });

  it("reads numbers the AI sent as text", () => {
    const estimate = FoodPhotoEstimate_parse(
      '{"items":[{"name":"Bread roll","grams":"60 g","calories":"~160","protein":"5.2","carbs":"30","fat":"1.5"}]}'
    );
    expect(estimate?.items[0]).to.deep.equal({
      name: "Bread roll",
      grams: 60,
      nutrients: { calories: 160, protein: 5.2, carbs: 30, fat: 1.5 },
    });
  });
});

describe("FoodPhotoEstimate_failure", () => {
  it("names an empty answer, a cut-off answer and an unreadable one", () => {
    expect(FoodPhotoEstimate_failure("  ", "stop", "Try another photo.")).to.equal(
      "The AI sent back an empty answer. Try again."
    );
    expect(FoodPhotoEstimate_failure('{"items":[', "length", "Try another photo.")).to.contain("too long");
    expect(FoodPhotoEstimate_failure("sorry", "stop", "Try another photo.")).to.equal(
      "The AI answer could not be read. Try another photo."
    );
  });
});
