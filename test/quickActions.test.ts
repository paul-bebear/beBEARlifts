import "mocha";
import { expect } from "chai";
import {
  QuickActions_inProgressLine,
  QuickActions_isBagCheckOn,
  QuickActions_list,
  QuickActions_workout,
} from "../src/models/quickActions";

describe("QuickActions", () => {
  it("lists only Food and Weight, the front-layer squares", () => {
    const list = QuickActions_list({ isOngoingProgress: false, canRecordRun: false });
    expect(list.squares.map((s) => s.label)).to.eql(["Food", "Weight"]);
  });

  it("adds a Run square after Food and Weight when the phone can record a run", () => {
    const list = QuickActions_list({ isOngoingProgress: false, canRecordRun: true });
    expect(list.squares.map((s) => s.id)).to.eql(["food", "weight", "run"]);
  });

  it("marks no square as coming soon", () => {
    const list = QuickActions_list({ isOngoingProgress: false, canRecordRun: false });
    expect(list.squares.filter((s) => s.isSoon)).to.eql([]);
  });

  it("starts a workout through the picker when none is ongoing", () => {
    const list = QuickActions_list({ isOngoingProgress: false, canRecordRun: false });
    expect(list.workout.label).to.equal("Start workout");
    expect(list.workout.action).to.equal("pick");
  });

  it("opens the bag check first when it is on, and resumes past it", () => {
    expect(QuickActions_workout({ isOngoingProgress: false, isBagCheckOn: true })).to.deep.equal({
      label: "Start workout",
      action: "bagCheck",
    });
    expect(QuickActions_workout({ isOngoingProgress: true, isBagCheckOn: true }).action).to.equal("resume");
    expect(QuickActions_workout({ isOngoingProgress: false, isBagCheckOn: false }).action).to.equal("pick");
  });

  it("turns the bag check on for a real program unless the user skipped it", () => {
    expect(QuickActions_isBagCheckOn(undefined, "abc")).to.equal(true);
    expect(QuickActions_isBagCheckOn(true, "abc")).to.equal(false);
    expect(QuickActions_isBagCheckOn(false, "emptyprogram")).to.equal(false);
    expect(QuickActions_isBagCheckOn(false, undefined)).to.equal(false);
  });

  it("resumes the ongoing workout", () => {
    const list = QuickActions_list({ isOngoingProgress: true, canRecordRun: false });
    expect(list.workout.label).to.equal("Resume workout");
    expect(list.workout.action).to.equal("resume");
  });

  it("writes the in-progress line in whole minutes", () => {
    expect(QuickActions_inProgressLine(23 * 60000 + 59000)).to.equal("Workout in progress · 23 min");
    expect(QuickActions_inProgressLine(20000)).to.equal("Workout in progress · 0 min");
  });

  it("adds hours past one hour and never goes negative", () => {
    expect(QuickActions_inProgressLine(72 * 60000)).to.equal("Workout in progress · 1 h 12 min");
    expect(QuickActions_inProgressLine(-5000)).to.equal("Workout in progress · 0 min");
  });
});
