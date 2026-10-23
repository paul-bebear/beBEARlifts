import "mocha";
import { expect } from "chai";
import { ReportsHub_groups, ReportsHub_rows, ReportsHub_title } from "../src/models/reportsHub";
import { FeatureLayer_of } from "../src/models/featureLayer";

const today = "2026-10-23";

function ids(input: { isOffline: boolean; hasRunSensors: boolean }, group: "numbers" | "extras"): string[] {
  const found = ReportsHub_groups({ ...input, today }).find((g) => g.id === group);
  return (found?.rows ?? []).map((r) => r.id);
}

describe("ReportsHub", () => {
  it("is called More", () => {
    expect(ReportsHub_title).to.equal("More");
  });

  it("has two groups, Your numbers then Extras", () => {
    const groups = ReportsHub_groups({ isOffline: true, hasRunSensors: true, today });
    expect(groups.map((g) => g.title)).to.deep.equal(["Your numbers", "Extras"]);
    expect(groups.map((g) => g.layer)).to.deep.equal([2, 3]);
    expect(groups.map((g) => g.hasStatsSections)).to.deep.equal([true, false]);
  });

  it("puts every row in the group of its feature layer", () => {
    for (const group of ReportsHub_groups({ isOffline: true, hasRunSensors: true, today })) {
      for (const row of group.rows) {
        expect(FeatureLayer_of(row.feature)).to.equal(group.layer);
      }
    }
  });

  it("holds graphs and exercise stats under Your numbers", () => {
    expect(ids({ isOffline: true, hasRunSensors: true }, "numbers")).to.deep.equal(["graphs", "exercise-stats"]);
  });

  it("holds every extra in the offline build with run sensors", () => {
    expect(ids({ isOffline: true, hasRunSensors: true }, "extras")).to.deep.equal([
      "friends",
      "add-friend",
      "honey",
      "badges",
      "notes",
      "check-ins",
      "music",
      "runs",
      "reports",
      "measurements",
      "body-scans",
      "steps",
      "photos",
      "seasons",
    ]);
  });

  it("drops Runs without sensors", () => {
    expect(ids({ isOffline: true, hasRunSensors: false }, "extras")).to.not.include("runs");
    expect(ids({ isOffline: true, hasRunSensors: false }, "extras")).to.include.members(["music", "reports"]);
  });

  it("drops Runs, music and reports online", () => {
    const extras = ids({ isOffline: false, hasRunSensors: true }, "extras");
    expect(extras).to.not.include.members(["runs", "music", "reports"]);
    expect(extras).to.include.members(["friends", "notes", "check-ins", "seasons"]);
  });

  it("reaches each feature that left the front screens", () => {
    const rows = ReportsHub_rows({ isOffline: true, hasRunSensors: true, today });
    const action = (id: string): unknown => rows.find((r) => r.id === id)?.action;
    expect(action("friends")).to.deep.equal({ kind: "screen", screen: "friends", tab: "friends" });
    expect(action("add-friend")).to.deep.equal({ kind: "addFriend" });
    expect(action("honey")).to.deep.equal({ kind: "honey" });
    expect(action("badges")).to.deep.equal({ kind: "screen", screen: "streak", tab: undefined });
    expect(action("notes")).to.deep.equal({ kind: "newNote", day: today });
    expect(action("check-ins")).to.deep.equal({ kind: "checkIn" });
    expect(action("runs")).to.deep.equal({ kind: "screen", screen: "runs", tab: undefined });
    expect(action("seasons")).to.deep.equal({ kind: "seasons" });
  });
});
