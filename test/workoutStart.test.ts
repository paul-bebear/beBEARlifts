import "mocha";
import { expect } from "chai";
import { GymBagCheck_startDay, IGymBagPlan } from "../src/models/gymBagCheck";

const plan = (kind: IGymBagPlan["kind"]): IGymBagPlan => ({ kind, day: 3, name: "Legs" });

describe("the day WorkoutStart_go sets before it starts", () => {
  it("is today's planned day when the plan says today", () => {
    expect(GymBagCheck_startDay("p", plan("today"))).to.equal(3);
  });

  it("is no day for the next day in order, which the program already holds", () => {
    expect(GymBagCheck_startDay("p", plan("next"))).to.equal(undefined);
  });

  it("is no day on a rest day, so Train anyway starts the next day in order", () => {
    expect(GymBagCheck_startDay("p", plan("rest"))).to.equal(undefined);
  });

  it("is no day without a program", () => {
    expect(GymBagCheck_startDay(undefined, plan("today"))).to.equal(undefined);
  });
});
