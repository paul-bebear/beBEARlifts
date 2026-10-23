import "mocha";
import { expect } from "chai";
import {
  FinishDayActions_hasFriends,
  FinishDayActions_list,
  FinishDayActions_saveReport,
  IFinishDayActionsInput,
} from "../src/models/finishDayActions";
import { Friends_empty, IFriendsState } from "../src/models/friends";
import { WorkoutReport_empty } from "../src/models/workoutReport";
import { Settings_build } from "../src/models/settings";
import { IHistoryRecord } from "../src/types";

function input(extra: Partial<IFinishDayActionsInput> = {}): IFinishDayActionsInput {
  return { hasFriends: false, isOfflineBuild: true, exportAvailable: true, hasExercises: true, ...extra };
}

const friends: IFriendsState = {
  version: 1,
  userId: "me",
  links: [
    {
      other: { userId: "friend", handle: "friend", displayName: "Friend" },
      status: "accepted",
      incoming: false,
      createdAt: "2026-10-23",
    },
  ],
};

describe("FinishDayActions_list", () => {
  it("keeps the bear, workout, one Share button and workout details in order", () => {
    expect(FinishDayActions_list(input())).to.eql([
      "cloudBackup",
      "bear",
      "workout",
      "share",
      "totals",
      "exercises",
      "muscleGroups",
      "personalRecords",
    ]);
  });

  it("shows the feed toggle after Share for a user with friends", () => {
    expect(FinishDayActions_list(input({ hasFriends: true }))).to.eql([
      "cloudBackup",
      "bear",
      "workout",
      "share",
      "feedShare",
      "totals",
      "exercises",
      "muscleGroups",
      "personalRecords",
    ]);
  });

  it("omits Share when export is unavailable while keeping the feed toggle", () => {
    const actions = FinishDayActions_list(input({ exportAvailable: false, hasFriends: true }));
    expect(actions).to.not.include("share");
    expect(actions).to.include("feedShare");
  });

  it("keeps the existing online build blocks without offline features", () => {
    expect(FinishDayActions_list(input({ isOfflineBuild: false, hasFriends: true }))).to.eql([
      "bear",
      "workout",
      "totals",
      "exercises",
      "muscleGroups",
      "personalRecords",
    ]);
  });

  it("omits exercises when none were started", () => {
    expect(FinishDayActions_list(input({ hasExercises: false }))).to.not.include("exercises");
  });

  it("never shows photo, music or report blocks for any combination of inputs", () => {
    for (const hasFriends of [false, true]) {
      for (const isOfflineBuild of [false, true]) {
        for (const exportAvailable of [false, true]) {
          const actions = FinishDayActions_list(input({ hasFriends, isOfflineBuild, exportAvailable }));
          expect(actions).to.not.include.members(["photo", "music", "report"]);
          expect(actions.filter((action) => action === "share")).to.have.length(
            isOfflineBuild && exportAvailable ? 1 : 0
          );
        }
      }
    }
  });
});

describe("FinishDayActions_hasFriends", () => {
  it("counts an accepted friend of the signed-in account", () => {
    expect(FinishDayActions_hasFriends(friends, "me")).to.equal(true);
  });

  it("excludes signed-out users and friends cached for another account", () => {
    expect(FinishDayActions_hasFriends(friends, undefined)).to.equal(false);
    expect(FinishDayActions_hasFriends(friends, "another")).to.equal(false);
  });

  it("excludes empty lists and incoming or outgoing requests", () => {
    expect(FinishDayActions_hasFriends(Friends_empty(), "me")).to.equal(false);
    for (const incoming of [false, true]) {
      const pending = { ...friends, links: [{ ...friends.links[0], status: "pending" as const, incoming }] };
      expect(FinishDayActions_hasFriends(pending, "me")).to.equal(false);
    }
  });
});

describe("FinishDayActions_saveReport", () => {
  const record: IHistoryRecord = {
    vtype: "history_record",
    id: 1,
    date: "2026-10-23",
    startTime: 1000,
    endTime: 2000,
    programId: "p",
    programName: "Program",
    day: 1,
    dayName: "Legs",
    entries: [],
  };
  const settings = Settings_build();

  it("keeps generating reports for More after the finish card is removed", () => {
    const log = FinishDayActions_saveReport(WorkoutReport_empty(), record, [record], settings, true);
    expect(log.reports.map((report) => report.workoutId)).to.eql([record.id]);
    expect(log.reports[0].dayName).to.equal("Legs");
  });

  it("preserves an existing report and its answers and summary", () => {
    const log = {
      version: 1 as const,
      reports: [
        {
          workoutId: record.id,
          timestamp: record.startTime,
          dayName: "Legs",
          items: [],
          answers: { squat: "onPurpose" as const },
          summary: "Saved coach note",
        },
      ],
    };
    expect(FinishDayActions_saveReport(log, record, [record], settings, true)).to.equal(log);
  });

  it("does nothing in online builds or before the finished record arrives", () => {
    const log = WorkoutReport_empty();
    expect(FinishDayActions_saveReport(log, record, [record], settings, false)).to.equal(log);
    expect(FinishDayActions_saveReport(log, undefined, [], settings, true)).to.equal(log);
  });
});
