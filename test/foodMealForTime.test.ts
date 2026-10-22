import "mocha";
import { expect } from "chai";
import { FoodMealForTime_pick } from "../src/models/foodMealForTime";

function at(hours: number, minutes: number): Date {
  return new Date(2026, 9, 22, hours, minutes);
}

describe("FoodMealForTime_pick", () => {
  it("picks breakfast before 11:00", () => {
    expect(FoodMealForTime_pick(at(0, 0))).to.equal("breakfast");
    expect(FoodMealForTime_pick(at(7, 30))).to.equal("breakfast");
    expect(FoodMealForTime_pick(at(10, 59))).to.equal("breakfast");
  });

  it("picks lunch from 11:00 to 14:59", () => {
    expect(FoodMealForTime_pick(at(11, 0))).to.equal("lunch");
    expect(FoodMealForTime_pick(at(14, 59))).to.equal("lunch");
  });

  it("picks snacks from 15:00 to 17:59", () => {
    expect(FoodMealForTime_pick(at(15, 0))).to.equal("snacks");
    expect(FoodMealForTime_pick(at(17, 59))).to.equal("snacks");
  });

  it("picks dinner from 18:00 on", () => {
    expect(FoodMealForTime_pick(at(18, 0))).to.equal("dinner");
    expect(FoodMealForTime_pick(at(23, 59))).to.equal("dinner");
  });
});
