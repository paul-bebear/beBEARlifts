import "mocha";
import { expect } from "chai";
import {
  ReportsHub_actionEffect,
  ReportsHub_groups,
  ReportsHub_rows,
  ReportsHub_title,
} from "../src/models/reportsHub";

const today = "2026-10-23";
const REMOVED_IDS = ["friends", "add-friend", "badges", "music", "photos"];

function ids(input: { isOffline: boolean; hasRunSensors: boolean }, group: "training" | "body" | "daily"): string[] {
  const found = ReportsHub_groups({ ...input, today }).find((g) => g.id === group);
  return (found?.rows ?? []).map((r) => r.id);
}

describe("ReportsHub", () => {
  it("is called Stats", () => {
    expect(ReportsHub_title).to.equal("Stats");
  });

  it("has three groups: Training, Body, Daily", () => {
    const groups = ReportsHub_groups({ isOffline: true, hasRunSensors: true, today });
    expect(groups.map((g) => g.title)).to.deep.equal(["Training", "Body", "Daily"]);
  });

  it("keeps the program card and stats sections on Training only", () => {
    const groups = ReportsHub_groups({ isOffline: true, hasRunSensors: false, today });
    expect(groups.map((g) => g.hasStatsSections)).to.deep.equal([true, false, false]);
    expect(groups.map((g) => g.hasProgramCard)).to.deep.equal([true, false, false]);
    expect(ReportsHub_groups({ isOffline: false, hasRunSensors: false, today })[0].hasProgramCard).to.equal(false);
  });

  it("orders the rows of each group", () => {
    const input = { isOffline: true, hasRunSensors: true };
    expect(ids(input, "training")).to.deep.equal(["graphs", "exercise-stats", "reports", "runs"]);
    expect(ids(input, "body")).to.deep.equal(["measurements", "body-scans", "steps", "seasons"]);
    expect(ids(input, "daily")).to.deep.equal(["check-ins", "notes"]);
  });

  it("no longer lists the five rows that repeat phone tiles", () => {
    for (const input of [
      { isOffline: true, hasRunSensors: true },
      { isOffline: false, hasRunSensors: false },
    ]) {
      const all = ReportsHub_rows({ ...input, today }).map((r) => r.id);
      expect(all).to.not.include.members(REMOVED_IDS);
      expect(all).to.have.length(input.isOffline ? 10 : 8);
    }
  });

  it("hides Runs when the device has no run sensors", () => {
    expect(ids({ isOffline: true, hasRunSensors: false }, "training")).to.deep.equal([
      "graphs",
      "exercise-stats",
      "reports",
    ]);
  });

  it("hides Runs and reports online", () => {
    expect(ids({ isOffline: false, hasRunSensors: true }, "training")).to.deep.equal(["graphs", "exercise-stats"]);
  });

  it("reaches the other features from their rows", () => {
    const rows = ReportsHub_rows({ isOffline: true, hasRunSensors: true, today });
    const action = (id: string): unknown => rows.find((r) => r.id === id)?.action;
    expect(action("notes")).to.deep.equal({ kind: "newNote", day: today });
    expect(action("check-ins")).to.deep.equal({ kind: "checkIn" });
    expect(action("runs")).to.deep.equal({ kind: "screen", screen: "runs", tab: undefined });
    expect(action("seasons")).to.deep.equal({ kind: "seasons" });
  });

  it("turns each row into the effect the screen applies", () => {
    const rows = ReportsHub_rows({ isOffline: true, hasRunSensors: true, today });
    const effect = (id: string): unknown => {
      const row = rows.find((r) => r.id === id);
      return row == null ? undefined : ReportsHub_actionEffect(row);
    };
    expect(effect("graphs")).to.deep.equal({ type: "pushScreen", screen: "graphsList", opts: undefined });
    expect(effect("seasons")).to.deep.equal({ type: "modal", name: "foodGoalsModal" });
    expect(effect("notes")).to.deep.equal({ type: "noteModal", day: today });
    expect(effect("check-ins")).to.deep.equal({ type: "toggleCheckIn" });
  });
});
