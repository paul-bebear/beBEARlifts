import "mocha";
import { expect } from "chai";
import { FoodGoals_parseForm, FoodGoals_toForm } from "../src/models/foodGoals";
import { FoodLog_defaultGoals } from "../src/models/foodLog";

describe("FoodGoals form", () => {
  it("round-trips the default goals", () => {
    expect(FoodGoals_parseForm(FoodGoals_toForm(FoodLog_defaultGoals))).to.deep.equal(FoodLog_defaultGoals);
  });

  it("treats an empty high number as a single target", () => {
    const form = FoodGoals_toForm(FoodLog_defaultGoals);
    form.protein = { min: "150", max: "" };
    expect(FoodGoals_parseForm(form)?.protein).to.deep.equal({ min: 150, max: 150 });
  });

  it("rejects a low number above the high number, or an empty low number", () => {
    const form = FoodGoals_toForm(FoodLog_defaultGoals);
    expect(FoodGoals_parseForm({ ...form, fat: { min: "100", max: "70" } })).to.equal(undefined);
    expect(FoodGoals_parseForm({ ...form, fat: { min: "", max: "70" } })).to.equal(undefined);
  });
});
