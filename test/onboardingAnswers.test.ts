import "mocha";
import { expect } from "chai";
import {
  OnboardingAnswers_body,
  OnboardingAnswers_empty,
  OnboardingAnswers_foodTargets,
  OnboardingAnswers_gymEquipment,
  OnboardingAnswers_isYouth,
  OnboardingAnswers_planInput,
  OnboardingAnswers_programGoal,
  OnboardingAnswers_togglePlace,
} from "../src/models/onboardingAnswers";
import { Settings_build } from "../src/models/settings";
import { IEquipment, IEquipmentData } from "../src/types";
import { FoodTargets_activities, FoodTargets_compute, FoodTargets_goals } from "../src/models/foodTargets";

const today = new Date(2026, 9, 23, 12);

describe("OnboardingAnswers", () => {
  it("converts supplied body details and leaves skipped fields absent", () => {
    const answers = {
      ...OnboardingAnswers_empty(),
      heightUnit: "cm" as const,
      height: "180",
      weight: "80,5",
      unit: "kg" as const,
      age: "30",
      sex: "female" as const,
      goal: "strength" as const,
    };
    expect(OnboardingAnswers_body(answers, 3, 2026)).to.deep.equal({
      profile: { activity: "light", goal: "maintain", heightUnit: "cm", heightCm: 180, sex: "female", birthYear: 1996 },
      weight: { value: 80.5, unit: "kg" },
    });
    expect(OnboardingAnswers_body({ ...answers, goal: "both" }, 5, 2026).profile).to.include({
      activity: "moderate",
      goal: "gain",
    });
    expect(OnboardingAnswers_body(OnboardingAnswers_empty(), 3, 2026).weight).to.equal(undefined);
    expect(
      OnboardingAnswers_body({ ...answers, age: "-1", height: "999", weight: "NaN" }, 3, 2026).profile.birthYear
    ).to.equal(undefined);
  });
  it("reads feet and inches and picks units from the phone's region", () => {
    const answers = { ...OnboardingAnswers_empty("en-US"), heightFt: "5", heightIn: "10" };
    expect(answers).to.include({ heightUnit: "ftin", unit: "lb" });
    expect(OnboardingAnswers_body(answers, 3, 2026).profile).to.include({ heightUnit: "ftin", heightCm: 178 });
    expect(OnboardingAnswers_body({ ...answers, heightIn: "" }, 3, 2026).profile.heightCm).to.equal(152);
    expect(OnboardingAnswers_body({ ...answers, heightFt: "12" }, 3, 2026).profile.heightCm).to.equal(undefined);
    expect(OnboardingAnswers_empty("de-DE")).to.include({ heightUnit: "cm", unit: "kg" });
    expect(OnboardingAnswers_empty("en-GB")).to.include({ unit: "kg" });
  });
  it("counts a lifter under 18 as youth", () => {
    const answers = OnboardingAnswers_empty();
    expect(OnboardingAnswers_isYouth({ ...answers, age: "16" })).to.equal(true);
    expect(OnboardingAnswers_isYouth({ ...answers, age: "18" })).to.equal(false);
    expect(OnboardingAnswers_isYouth({ ...answers, age: "" })).to.equal(false);
    expect(OnboardingAnswers_planInput({ ...answers, age: "16.4" }).age).to.equal(16);
  });
  it("passes available days to the plan input and leaves unanswered days absent", () => {
    expect(OnboardingAnswers_planInput({ ...OnboardingAnswers_empty(), days: 3, experience: "years" })).to.include({
      days: 3,
      experience: "years",
    });
    expect(OnboardingAnswers_planInput(OnboardingAnswers_empty()).days).to.equal(undefined);
  });
  it("uses the chosen food activity and weight goal independently of the training plan", () => {
    const answers = { ...OnboardingAnswers_empty(), activity: "sedentary" as const, foodGoal: "lose" as const };
    expect(OnboardingAnswers_body(answers, 5, 2026).profile).to.include({ activity: "sedentary", goal: "lose" });
    expect(OnboardingAnswers_programGoal(answers, 1).kind).to.equal("buildMuscle");
  });
  const foodAnswers = {
    ...OnboardingAnswers_empty("fr-FR"),
    height: "180",
    weight: "80",
    age: "30",
    sex: "male" as const,
    activity: "moderate" as const,
    foodGoal: "maintain" as const,
  };
  it("calculates food targets and the calculator profile from metric answers", () => {
    expect(OnboardingAnswers_foodTargets(foodAnswers, today)).to.deep.equal({
      goals: {
        calories: { min: 2660, max: 2860 },
        protein: { min: 130, max: 175 },
        carbs: { min: 365, max: 415 },
        fat: { min: 50, max: 80 },
      },
      profile: {
        activity: "moderate",
        goal: "maintain",
        heightUnit: "cm",
        heightCm: 180,
        sex: "male",
        birthYear: 1996,
      },
    });
  });
  it("uses the calculator's exact imperial conversion and decimal parsing", () => {
    const answers = {
      ...foodAnswers,
      heightUnit: "ftin" as const,
      heightFt: "5",
      heightIn: "10",
      unit: "lb" as const,
      weight: "180,5",
      sex: "female" as const,
    };
    const result = OnboardingAnswers_foodTargets(answers, today);
    expect(result?.profile).to.include({ heightCm: 177.8, heightUnit: "ftin", sex: "female" });
    expect(result?.goals).to.deep.equal(
      FoodTargets_compute(
        { weightKg: 180.5 * 0.45359237, heightCm: 177.8, sex: "female", age: 30 },
        "moderate",
        "maintain"
      ).goals
    );
  });
  for (const { key: activity } of FoodTargets_activities) {
    for (const { key: foodGoal } of FoodTargets_goals) {
      it(`uses the calculator's ${activity} activity and ${foodGoal} goal`, () => {
        const result = OnboardingAnswers_foodTargets({ ...foodAnswers, activity, foodGoal }, today);
        expect(result?.goals).to.deep.equal(
          FoodTargets_compute({ weightKg: 80, heightCm: 180, sex: "male", age: 30 }, activity, foodGoal).goals
        );
        expect(result?.profile).to.include({ activity, goal: foodGoal });
      });
    }
  }
  it("leaves targets unset when food choices or required body details are skipped or invalid", () => {
    const patches = [
      { activity: undefined },
      { foodGoal: undefined },
      { sex: undefined },
      { age: "" },
      { age: "13" },
      { age: "101" },
      { height: "" },
      { height: "999" },
      { weight: "" },
      { weight: "NaN" },
      { weight: "0" },
    ];
    for (const patch of patches) {
      expect(OnboardingAnswers_foodTargets({ ...foodAnswers, ...patch }, today), JSON.stringify(patch)).to.equal(
        undefined
      );
    }
    expect(OnboardingAnswers_foodTargets(OnboardingAnswers_empty(), today)).to.equal(undefined);
  });
  it("keeps the place picks as a set and treats no pick as no equipment", () => {
    expect(OnboardingAnswers_togglePlace(["gym"], "street")).to.deep.equal(["gym", "street"]);
    expect(OnboardingAnswers_togglePlace(["gym", "street"], "gym")).to.deep.equal(["street"]);
    const input = OnboardingAnswers_planInput({ ...OnboardingAnswers_empty(), goal: "both", agile: true });
    expect(input).to.deep.include({ picks: ["none"], goal: "both", agile: true, experience: "new" });
  });
  it("fills the goal card with Build muscle for size and both, and Maintain for strength", () => {
    const answers = { ...OnboardingAnswers_empty(), sex: "male" as const };
    const weight = { value: 70, unit: "kg" as const };
    expect(OnboardingAnswers_programGoal(answers, 5, weight)).to.deep.equal({
      kind: "buildMuscle",
      activity: "5to10k",
      startedAt: 5,
      startWeight: weight,
      sex: "male",
    });
    expect(OnboardingAnswers_programGoal({ ...answers, goal: "both" }, 5).kind).to.equal("buildMuscle");
    expect(OnboardingAnswers_programGoal({ ...answers, goal: "strength" }, 5).kind).to.equal("maintain");
  });
  it("hides built-in equipment outside the places and keeps custom equipment", () => {
    const gym = Settings_build().gyms[0].equipment;
    const custom = { ...gym.dumbbell!, name: "Sandbag" } as IEquipmentData;
    const current = { ...gym, sandbag: custom } as Record<IEquipment, IEquipmentData | undefined>;
    const result = OnboardingAnswers_gymEquipment(current, ["dumbbell", "bodyweight"]);
    expect(result.dumbbell?.isDeleted).to.equal(false);
    expect(result.barbell?.isDeleted).to.equal(true);
    expect(result.cable?.isDeleted).to.equal(true);
    expect(result.dumbbell?.plates).to.deep.equal(gym.dumbbell?.plates);
    expect((result as Record<string, IEquipmentData | undefined>).sandbag).to.equal(custom);
    const full = OnboardingAnswers_gymEquipment({ ...result, barbell: undefined }, ["barbell", "dumbbell"]);
    expect(full.barbell).to.include({ isDeleted: false });
    expect(full.barbell?.plates.length).to.be.greaterThan(0);
  });
});
