import "mocha";
import { expect } from "chai";
import { WorkoutShareMenu_record, WorkoutShareMenu_rows } from "../src/models/workoutShareMenu";
import { IHistoryRecord } from "../src/types";

function record(id: number): IHistoryRecord {
  return { id } as IHistoryRecord;
}

describe("WorkoutShareMenu_rows", () => {
  it("opens with the bear share cards and has no Instagram, TikTok or image rows", () => {
    expect(WorkoutShareMenu_rows({ isMobile: true, healthEligible: false })).to.eql(["shareCards", "link", "text"]);
  });

  it("shows the health sync row on a phone that can sync", () => {
    expect(WorkoutShareMenu_rows({ isMobile: true, healthEligible: true })).to.eql([
      "shareCards",
      "health",
      "link",
      "text",
    ]);
  });

  it("keeps the share cards on web and hides health sync there", () => {
    expect(WorkoutShareMenu_rows({ isMobile: false, healthEligible: true })).to.eql(["shareCards", "link", "text"]);
  });
});

describe("WorkoutShareMenu_record", () => {
  const history = [record(30), record(20), record(10)];

  it("finds a history record by id", () => {
    expect(WorkoutShareMenu_record({ historyRecordId: 20, history, progress: {} })?.id).to.equal(20);
  });

  it("returns the past workout opened from History by its progress id", () => {
    expect(WorkoutShareMenu_record({ progressId: 10, history, progress: { 10: record(10) } })?.id).to.equal(10);
  });

  it("returns the stored in-progress workout for progress id 0", () => {
    expect(WorkoutShareMenu_record({ progressId: 0, history, storedProgress: record(99), progress: {} })?.id).to.equal(
      99
    );
  });

  it("falls back to the latest workout with no ids", () => {
    expect(WorkoutShareMenu_record({ history, progress: {} })?.id).to.equal(30);
  });

  it("returns nothing when the opened workout is gone", () => {
    expect(WorkoutShareMenu_record({ progressId: 10, history, progress: {} })).to.equal(undefined);
  });
});
