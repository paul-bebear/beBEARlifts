import "mocha";
import { expect } from "chai";
import { Equipment_exactWeightStep } from "../src/models/equipment";
import { Exercise_toKey } from "../src/models/exercise";
import { Settings_build } from "../src/models/settings";
import { IExerciseType, ISettings } from "../src/types";

const type = (equipment: string): IExerciseType => ({ id: "testLift", equipment });

describe("Equipment_exactWeightStep", () => {
  let settings: ISettings;

  beforeEach(() => {
    settings = Settings_build();
  });

  it("has no step without an exercise, for unknown gear, for fixed gear or for plates on a bar", () => {
    const equipment = settings.gyms[0].equipment;
    equipment.cable = { ...equipment.cable!, isFixed: true };
    expect(Equipment_exactWeightStep(settings, type("cable"))).to.equal(undefined);
    expect(Equipment_exactWeightStep(settings, undefined)).to.equal(undefined);
    expect(Equipment_exactWeightStep(settings, type("noSuchGear"))).to.equal(undefined);
    expect(Equipment_exactWeightStep(settings, type("barbell"))).to.equal(undefined);
  });

  it("defaults to 2.5 in lb and 1 in kg, and the gear unit beats the app unit", () => {
    settings.units = "lb";
    expect(Equipment_exactWeightStep(settings, type("dumbbell"))).to.equal(2.5);
    settings.units = "kg";
    expect(Equipment_exactWeightStep(settings, type("dumbbell"))).to.equal(1);
    settings.units = "lb";
    const equipment = settings.gyms[0].equipment;
    equipment.dumbbell = { ...equipment.dumbbell!, unit: "kg" };
    expect(Equipment_exactWeightStep(settings, type("dumbbell"))).to.equal(1);
  });

  it("uses the custom rounding of the exercise", () => {
    const exercise = type("dumbbell");
    settings.exerciseData[Exercise_toKey(exercise)] = {
      rounding: 0.5,
      equipment: { [settings.gyms[0].id]: "dumbbell" },
    };
    expect(Equipment_exactWeightStep(settings, exercise)).to.equal(0.5);
  });
});
