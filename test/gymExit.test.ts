import "mocha";
import { expect } from "chai";
import { GymExit_sheet } from "../src/models/gymExit";
import { IHistoryRecord, ISet } from "../src/types";

function set(index: number, isCompleted: boolean): ISet {
  return { vtype: "set", index, id: `s${index}`, reps: 5, isCompleted, completedReps: isCompleted ? 5 : undefined };
}

function progress(sets: ISet[]): IHistoryRecord {
  return {
    vtype: "history_record",
    id: 1,
    date: new Date(2026, 9, 26).toISOString(),
    startTime: 1,
    programId: "p",
    programName: "P",
    day: 1,
    dayName: "Push",
    entries:
      sets.length === 0
        ? []
        : [{ vtype: "history_entry", exercise: { id: "squat" }, sets, warmupSets: [], index: 0, id: "e" }],
  };
}

describe("GymExit_sheet", () => {
  it("asks the two exit questions and labels the finish", () => {
    const sheet = GymExit_sheet(progress([set(0, true), set(1, true), set(2, false)]));
    expect(sheet.questions.map((q) => q.text)).to.deep.equal(["Racked your weights?", "Cooled down?"]);
    expect(sheet.finishLabel).to.equal("Finish workout");
    expect(sheet.title).to.equal("2 of 3 sets done");
  });

  it("titles a workout with no sets plainly", () => {
    expect(GymExit_sheet(progress([])).title).to.equal("No sets logged yet");
  });
});
