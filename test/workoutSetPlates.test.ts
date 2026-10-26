import "mocha";
import { expect } from "chai";
import { ISet } from "../src/types";
import { Settings_build } from "../src/models/settings";
import { PlatesLine_shouldShow, WorkoutSetPlates_line } from "../src/utils/workoutSetPlates";
import { Equipment_build } from "../src/models/equipment";
import { Weight_build, Weight_calculatePlates } from "../src/models/weight";

function set(weight: number | undefined, completedWeight?: number): ISet {
  return {
    vtype: "set",
    id: "s1",
    index: 0,
    reps: 5,
    isCompleted: completedWeight != null,
    weight: weight != null ? { value: weight, unit: "lb" } : undefined,
    completedWeight: completedWeight != null ? { value: completedWeight, unit: "lb" } : undefined,
  };
}

describe("WorkoutSetPlates", () => {
  const settings = Settings_build();

  it("formats one side for a barbell exercise and flags an exact match", () => {
    expect(WorkoutSetPlates_line(set(135), settings, { id: "squat", equipment: "barbell" })).to.eql({
      plates: "45",
      sidePlates: [{ value: 45, unit: "lb" }],
      isMatch: true,
    });
  });

  it("prefers the completed weight and flags a weight the plates cannot reach", () => {
    const line = WorkoutSetPlates_line(set(135, 137), settings, { id: "squat", equipment: "barbell" });
    expect(line?.isMatch).to.eql(false);
  });

  describe("PlatesLine_shouldShow", () => {
    it("shows for barbell, EZ bar, trap bar and Smith machine", () => {
      expect(PlatesLine_shouldShow({ id: "squat", equipment: "barbell" }, settings)).to.eql(true);
      expect(PlatesLine_shouldShow({ id: "curl", equipment: "ezbar" }, settings)).to.eql(true);
      expect(PlatesLine_shouldShow({ id: "deadlift", equipment: "trapbar" }, settings)).to.eql(true);
      expect(PlatesLine_shouldShow({ id: "squat", equipment: "smith" }, settings)).to.eql(true);
    });

    it("hides for dumbbell, cable, leverage machine, kettlebell and bodyweight", () => {
      expect(PlatesLine_shouldShow({ id: "hammerCurl", equipment: "dumbbell" }, settings)).to.eql(false);
      expect(PlatesLine_shouldShow({ id: "seatedRow", equipment: "cable" }, settings)).to.eql(false);
      expect(PlatesLine_shouldShow({ id: "reverseFly", equipment: "leverageMachine" }, settings)).to.eql(false);
      expect(PlatesLine_shouldShow({ id: "swing", equipment: "kettlebell" }, settings)).to.eql(false);
      expect(PlatesLine_shouldShow({ id: "pushUp", equipment: "bodyweight" }, settings)).to.eql(false);
    });

    it("hides fixed-weight barbell equipment and shows a custom bar with a bar weight", () => {
      const custom = Settings_build();
      custom.gyms[0].equipment.barbell!.isFixed = true;
      custom.gyms[0].equipment.machineBar = Equipment_build("Machine bar");
      custom.gyms[0].equipment.machineBar.bar = { lb: Weight_build(45, "lb"), kg: Weight_build(20, "kg") };
      custom.gyms[0].equipment.plateMachine = Equipment_build("Plate machine");
      expect(PlatesLine_shouldShow({ id: "squat", equipment: "barbell" }, custom)).to.eql(false);
      expect(PlatesLine_shouldShow({ id: "squat", equipment: "machineBar" }, custom)).to.eql(true);
      expect(PlatesLine_shouldShow({ id: "legPress", equipment: "plateMachine" }, custom)).to.eql(false);
    });
  });

  describe("plate rounding", () => {
    it("rounds a leverage machine weight to the exercise rounding, not to plates", () => {
      const reverseFly = { id: "reverseFly", equipment: "leverageMachine" } as const;
      const result = Weight_calculatePlates(Weight_build(52, "kg"), settings, "kg", reverseFly);
      expect(result.plates).to.eql([]);
      expect(result.totalWeight).to.eql(Weight_build(52, "kg"));
    });

    it("keeps plate rounding for a barbell", () => {
      const squat = { id: "squat", equipment: "barbell" } as const;
      const result = Weight_calculatePlates(Weight_build(52, "kg"), settings, "kg", squat);
      expect(result.plates.length).to.be.greaterThan(0);
      expect(result.totalWeight.value).to.not.eql(52);
    });
  });

  it("returns nothing without a weight, without equipment, or when the bar alone is enough", () => {
    expect(WorkoutSetPlates_line(set(undefined), settings, { id: "squat", equipment: "barbell" })).to.eql(undefined);
    expect(WorkoutSetPlates_line(set(135), settings, { id: "pushUp", equipment: "bodyweight" })).to.eql(undefined);
    expect(WorkoutSetPlates_line(set(45), settings, { id: "squat", equipment: "barbell" })).to.eql(undefined);
  });
});
