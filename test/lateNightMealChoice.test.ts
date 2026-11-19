import "mocha";
import { expect } from "chai";
import sinon from "sinon";
import { ILateNightMealTarget } from "../src/models/lateNightMeal";
import * as dialog from "../src/utils/dialog";
import { LateNightMealChoice_pick } from "../src/utils/lateNightMealChoice";

const today: ILateNightMealTarget = { label: "Today", day: "2026-11-19", meal: "breakfast" };
const lastNight: ILateNightMealTarget = { label: "Last night", day: "2026-11-18", meal: "dinner" };
const both = { question: "Today or last night?", targets: [today, lastNight] };

describe("LateNightMealChoice_pick", () => {
  afterEach(() => sinon.restore());

  it("returns the first target without asking when there is one target or no question", async () => {
    const choice = sinon.stub(dialog, "Dialog_choice");
    expect(await LateNightMealChoice_pick({ question: "Which?", targets: [today] })).to.equal(today);
    expect(await LateNightMealChoice_pick({ targets: [today, lastNight] })).to.equal(today);
    expect(await LateNightMealChoice_pick({ targets: [] })).to.equal(undefined);
    expect(choice.callCount).to.equal(0);
  });

  it("asks with the labels, returns the chosen target and returns nothing when cancelled", async () => {
    const choice = sinon.stub(dialog, "Dialog_choice").resolves(1);
    expect(await LateNightMealChoice_pick(both)).to.equal(lastNight);
    expect(choice.firstCall.args).to.deep.equal(["Log a meal", "Today or last night?", ["Today", "Last night"]]);
    choice.resolves(undefined);
    expect(await LateNightMealChoice_pick(both)).to.equal(undefined);
  });
});
