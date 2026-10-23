import "mocha";
import { expect } from "chai";
import {
  FoodTargets_aim,
  FoodTargets_back,
  FoodTargets_bmi,
  FoodTargets_bodyError,
  FoodTargets_compute,
  FoodTargets_defaultProfile,
  FoodTargets_factor,
  FoodTargets_mayDiet,
  FoodTargets_next,
  FoodTargets_stepNumber,
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
const winter = new Date(2026, 9, 23, 12);
const spring = new Date(2027, 3, 10, 12);

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

  it("never goes below 1500 calories for a man", () => {
    const result = FoodTargets_compute({ weightKg: 50, heightCm: 160, sex: "male", age: 70 }, "sedentary", "lose");
    expect(result.isFloored).to.equal(true);
    expect(result.goals.calories).to.deep.equal({ min: 1500, max: 1600 });
  });

  it("splits the calorie target into macros that add back up to it", () => {
    const mid = (r: { min: number; max: number }): number => (r.min + r.max) / 2;
    for (const [body, goal] of [
      [man, "maintain"],
      [man, "gain"],
      [woman, "lose"],
    ] as const) {
      const { goals } = FoodTargets_compute(body, "moderate", goal);
      const macroCalories = mid(goals.protein) * 4 + mid(goals.carbs) * 4 + mid(goals.fat) * 9;
      expect(macroCalories, `${body.sex} ${goal}`).to.be.closeTo(mid(goals.calories), 10);
    }
  });

  it("caps protein and fat at the height-based weight for a 150 kg person losing weight", () => {
    const body: IFoodBody = { weightKg: 150, heightCm: 170, sex: "male", age: 40 };
    const result = FoodTargets_compute(body, "sedentary", "lose");
    expect(result.maintenance).to.equal(2840);
    expect(result.goals).to.deep.equal({
      calories: { min: 2170, max: 2370 },
      protein: { min: 110, max: 155 },
      carbs: { min: 285, max: 335 },
      fat: { min: 40, max: 70 },
    });
    const lighter = FoodTargets_compute({ ...body, weightKg: 70 }, "sedentary", "lose");
    expect(result.goals.protein).to.deep.equal(lighter.goals.protein);
    expect(result.goals.fat).to.deep.equal(lighter.goals.fat);
  });

  it("uses actual weight below the height-based cap", () => {
    const result = FoodTargets_compute({ ...man, weightKg: 60 }, "moderate", "maintain");
    expect(result.goals.protein).to.deep.equal({ min: 95, max: 130 });
    expect(result.goals.fat).to.deep.equal({ min: 35, max: 60 });
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
    expect(FoodTargets_result(form, winter)?.goals.calories).to.deep.equal({ min: 2660, max: 2860 });
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

  it("gives the weight range in pounds and the height range in feet for a pound user", () => {
    const flow = FoodTargets_start(FoodTargets_defaultProfile, undefined, "lb", 2026);
    const form = FoodTargets_setForm(flow, {
      weight: "50",
      heightFt: "5",
      heightIn: "11",
      sex: "male",
      age: "30",
    }).form;
    expect(FoodTargets_bodyError(form)).to.equal("Enter a weight from 66 to 660 lb.");
    expect(FoodTargets_bodyError({ ...form, weight: "176", heightFt: "3" })).to.equal(
      "Enter a height from 3 ft 11 in to 7 ft 6 in."
    );
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
    const profile = FoodTargets_toProfile(form, winter);
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

describe("FoodTargets seasons", () => {
  const teen: IFoodBody = { weightKg: 60, heightCm: 175, sex: "male", age: 17 };
  const skinny: IFoodBody = { weightKg: 58, heightCm: 180, sex: "male", age: 22 };

  it("bulks 15% above maintenance from 18 and 10% under 18", () => {
    const adult = FoodTargets_compute(man, "moderate", "bulk");
    expect(FoodTargets_factor(man, "bulk").factor).to.equal(1.15);
    expect(adult.target).to.equal(3170);
    expect(FoodTargets_factor(teen, "bulk").factor).to.equal(1.1);
  });

  it("leans out 20% below maintenance and stays at maintenance in summer", () => {
    expect(FoodTargets_factor(man, "lean")).to.deep.equal({ factor: 0.8, isDeficitBlocked: false });
    expect(FoodTargets_compute(man, "moderate", "lean").goals).to.deep.equal(
      FoodTargets_compute(man, "moderate", "lose").goals
    );
    expect(FoodTargets_compute(man, "moderate", "summer").goals).to.deep.equal(
      FoodTargets_compute(man, "moderate", "maintain").goals
    );
  });

  it("never gives a deficit under 18 or with a BMI under 20", () => {
    expect(FoodTargets_bmi(skinny)).to.be.closeTo(17.9, 0.1);
    for (const body of [teen, skinny]) {
      for (const aim of ["lean", "lose"] as const) {
        const result = FoodTargets_compute(body, "moderate", aim);
        expect(result.isDeficitBlocked, `${body.age} ${aim}`).to.equal(true);
        expect(result.goals).to.deep.equal(FoodTargets_compute(body, "moderate", "maintain").goals);
      }
    }
    expect(FoodTargets_mayDiet({ ...skinny, weightKg: 65 })).to.equal(true);
  });

  it("skips the goal step and picks the aim from the date when seasons is on", () => {
    const flow = FoodTargets_start(FoodTargets_defaultProfile, { value: 80, unit: "kg" }, "kg", 2026);
    expect(flow.form.seasons).to.equal(false);
    const body = FoodTargets_setForm(flow, { heightCm: "180", sex: "male", age: "30", seasons: true });
    const activity = FoodTargets_next(body);
    expect(FoodTargets_stepNumber(activity)).to.deep.equal({ index: 2, count: 3 });
    const result = FoodTargets_pickActivity(activity, "moderate");
    expect(result.step).to.equal("result");
    expect(FoodTargets_back(result)?.step).to.equal("activity");
    expect(FoodTargets_aim(result.form, winter)).to.equal("bulk");
    expect(FoodTargets_aim(result.form, spring)).to.equal("lean");
    expect(FoodTargets_aim({ ...result.form, south: true }, winter)).to.equal("lean");
    expect(FoodTargets_result(result.form, winter)?.target).to.equal(3170);
  });

  it("saves the seasons switches and the current season, and reads them back", () => {
    const flow = FoodTargets_start(FoodTargets_defaultProfile, { value: 80, unit: "kg" }, "kg", 2026);
    const form = FoodTargets_setForm(flow, {
      heightCm: "180",
      sex: "male",
      age: "30",
      seasons: true,
      south: true,
    }).form;
    const profile = FoodTargets_toProfile(form, winter);
    expect(profile).to.include({ seasons: true, south: true, lastSeason: "lean" });
    expect(FoodLog_parse({ profile }).profile).to.deep.equal(profile);
    const next = FoodTargets_start(profile, undefined, "kg", 2026).form;
    expect([next.seasons, next.south]).to.deep.equal([true, true]);
    expect(FoodTargets_toProfile({ ...form, seasons: false, south: false }, winter)).to.not.have.any.keys(
      "seasons",
      "south",
      "lastSeason"
    );
    expect(FoodTargets_parseProfile({ seasons: "yes", lastSeason: "winter" })).to.deep.equal(
      FoodTargets_defaultProfile
    );
  });
});
