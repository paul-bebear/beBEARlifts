import "mocha";
import { expect } from "chai";
import {
  FoodTargets_back,
  FoodTargets_bodyError,
  FoodTargets_compute,
  FoodTargets_defaultProfile,
  FoodTargets_next,
  FoodTargets_parseBody,
  FoodTargets_parseProfile,
  FoodTargets_pickActivity,
  FoodTargets_pickGoal,
  FoodTargets_result,
  FoodTargets_setForm,
  FoodTargets_setHeightUnit,
  FoodTargets_start,
  FoodTargets_toProfile,
  IFoodBody,
} from "../src/models/foodTargets";
import { FoodLog_parse } from "../src/models/foodLog";

const man: IFoodBody = { weightKg: 80, heightCm: 180, sex: "male", age: 30 };
const woman: IFoodBody = { weightKg: 60, heightCm: 165, sex: "female", age: 35 };

describe("FoodTargets compute", () => {
  it("uses Mifflin-St Jeor times the activity factor for maintenance", () => {
    const result = FoodTargets_compute(man, "moderate", "maintain");
    expect(result.maintenance).to.equal(2760);
    expect(result.goals).to.deep.equal({
      calories: { min: 2660, max: 2860 },
      protein: { min: 130, max: 175 },
      carbs: { min: 365, max: 415 },
      fat: { min: 50, max: 80 },
    });
  });

  it("goes 10% above maintenance to gain, and carbs take the extra calories", () => {
    const result = FoodTargets_compute(man, "moderate", "gain");
    expect(result.goals.calories).to.deep.equal({ min: 2930, max: 3130 });
    expect(result.goals.protein).to.deep.equal({ min: 130, max: 175 });
    expect(result.goals.carbs).to.deep.equal({ min: 435, max: 485 });
  });

  it("goes 20% below maintenance to lose, with the female constant", () => {
    const result = FoodTargets_compute(woman, "light", "lose");
    expect(result.maintenance).to.equal(1780);
    expect(result.isFloored).to.equal(false);
    expect(result.goals).to.deep.equal({
      calories: { min: 1320, max: 1520 },
      protein: { min: 95, max: 130 },
      carbs: { min: 110, max: 160 },
      fat: { min: 35, max: 60 },
    });
  });

  it("never goes below 1200 calories for a woman", () => {
    const result = FoodTargets_compute({ weightKg: 50, heightCm: 155, sex: "female", age: 60 }, "sedentary", "lose");
    expect(result.isFloored).to.equal(true);
    expect(result.goals.calories).to.deep.equal({ min: 1200, max: 1300 });
    expect(result.goals.carbs).to.deep.equal({ min: 115, max: 140 });
  });
});

describe("FoodTargets form", () => {
  it("prefills weight from the latest stat in the user's unit", () => {
    const flow = FoodTargets_start(FoodTargets_defaultProfile, { value: 80, unit: "kg" }, "lb", 2026);
    expect(flow.form.weight).to.equal("176.4");
    expect(flow.form.weightUnit).to.equal("lb");
    expect(flow.form.heightUnit).to.equal("ftin");
  });

  it("reads pounds and feet and inches", () => {
    const flow = FoodTargets_start(FoodTargets_defaultProfile, undefined, "lb", 2026);
    const form = FoodTargets_setForm(flow, {
      weight: "176",
      heightFt: "5",
      heightIn: "11",
      sex: "male",
      age: "30",
    }).form;
    const body = FoodTargets_parseBody(form)!;
    expect(body.weightKg).to.be.closeTo(79.83, 0.01);
    expect(body.heightCm).to.be.closeTo(180.34, 0.01);
    expect(FoodTargets_result(form)?.goals.calories).to.deep.equal({ min: 2660, max: 2860 });
  });

  it("converts the typed height when the unit changes", () => {
    const flow = FoodTargets_start(FoodTargets_defaultProfile, undefined, "kg", 2026);
    const form = FoodTargets_setHeightUnit(FoodTargets_setForm(flow, { heightCm: "180" }).form, "ftin");
    expect([form.heightFt, form.heightIn]).to.deep.equal(["5", "11"]);
    expect(FoodTargets_setHeightUnit(form, "cm").heightCm).to.equal("180");
  });

  it("names the first field that is missing or out of range", () => {
    const flow = FoodTargets_start(FoodTargets_defaultProfile, { value: 80, unit: "kg" }, "kg", 2026);
    expect(FoodTargets_bodyError(flow.form)).to.equal("Enter a height from 120 to 230 cm.");
    const form = FoodTargets_setForm(flow, { heightCm: "180", age: "30" }).form;
    expect(FoodTargets_bodyError(form)).to.equal("Pick male or female. The formula uses it.");
    expect(FoodTargets_bodyError({ ...form, sex: "male" })).to.equal(undefined);
  });
});

describe("FoodTargets steps", () => {
  it("stays on the body step until the body is valid, then walks to the result", () => {
    const flow = FoodTargets_start(FoodTargets_defaultProfile, { value: 80, unit: "kg" }, "kg", 2026);
    expect(FoodTargets_next(flow).step).to.equal("body");
    const filled = FoodTargets_next(FoodTargets_setForm(flow, { heightCm: "180", sex: "male", age: "30" }));
    expect(filled.step).to.equal("activity");
    const goal = FoodTargets_pickActivity(filled, "active");
    expect(goal.step).to.equal("goal");
    const result = FoodTargets_pickGoal(goal, "lose");
    expect(result.step).to.equal("result");
    expect(result.form.goal).to.equal("lose");
    expect(FoodTargets_back(result)?.step).to.equal("goal");
    expect(FoodTargets_back(flow)).to.equal(undefined);
  });

  it("saves a profile that prefills the next run", () => {
    const flow = FoodTargets_start(FoodTargets_defaultProfile, { value: 80, unit: "kg" }, "kg", 2026);
    const form = FoodTargets_setForm(flow, {
      heightCm: "180",
      sex: "female",
      age: "30",
      activity: "light",
      goal: "gain",
    }).form;
    const profile = FoodTargets_toProfile(form, 2026);
    expect(profile).to.deep.equal({
      activity: "light",
      goal: "gain",
      heightUnit: "cm",
      sex: "female",
      heightCm: 180,
      birthYear: 1996,
    });
    const next = FoodTargets_start(FoodLog_parse({ profile }).profile, undefined, "kg", 2027).form;
    expect([next.heightCm, next.sex, next.age, next.activity, next.goal]).to.deep.equal([
      "180",
      "female",
      "31",
      "light",
      "gain",
    ]);
  });
});

describe("FoodTargets profile parse", () => {
  it("falls back to defaults for an old food log or bad values", () => {
    expect(FoodLog_parse({ entries: [] }).profile).to.deep.equal(FoodTargets_defaultProfile);
    expect(FoodTargets_parseProfile({ activity: "couch", goal: 3, sex: "x", heightCm: -1 })).to.deep.equal(
      FoodTargets_defaultProfile
    );
  });
});
