import "mocha";
import { expect } from "chai";
import { QuickActions_inProgressLine, QuickActions_list } from "../src/models/quickActions";

describe("QuickActions", () => {
  it("lists Food, Weight, Friend and Note in that order", () => {
    const list = QuickActions_list({ isOngoingProgress: false, canRun: false });
    expect(list.squares.map((s) => s.label)).to.eql(["Food", "Weight", "Friend", "Note"]);
  });

  it("marks no square as coming soon now that the note editor exists", () => {
    const list = QuickActions_list({ isOngoingProgress: false, canRun: false });
    expect(list.squares.filter((s) => s.isSoon)).to.eql([]);
  });

  it("starts a workout through the picker when none is ongoing", () => {
    const list = QuickActions_list({ isOngoingProgress: false, canRun: false });
    expect(list.workout.label).to.equal("Start workout");
    expect(list.workout.action).to.equal("pick");
  });

  it("resumes the ongoing workout", () => {
    const list = QuickActions_list({ isOngoingProgress: true, canRun: false });
    expect(list.workout.label).to.equal("Resume workout");
    expect(list.workout.action).to.equal("resume");
  });

  it("shows the Run button only when the phone can track a run", () => {
    expect(QuickActions_list({ isOngoingProgress: false, canRun: true }).workout.showsRun).to.equal(true);
    expect(QuickActions_list({ isOngoingProgress: true, canRun: true }).workout.showsRun).to.equal(true);
    expect(QuickActions_list({ isOngoingProgress: false, canRun: false }).workout.showsRun).to.equal(false);
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
