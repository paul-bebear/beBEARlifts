import "mocha";
import { expect } from "chai";
import { ReportsHub_rows } from "../src/models/reportsHub";

describe("ReportsHub", () => {
  it("holds the four report rows in the offline build with run sensors", () => {
    expect(ReportsHub_rows({ isOffline: true, hasRunSensors: true }).map((r) => r.screen)).to.deep.equal([
      "runs",
      "graphsList",
      "reports",
      "exercises",
    ]);
  });

  it("drops Runs without sensors and the offline-only rows online", () => {
    expect(ReportsHub_rows({ isOffline: true, hasRunSensors: false }).map((r) => r.id)).to.deep.equal([
      "graphs",
      "reports",
      "exercise-stats",
    ]);
    expect(ReportsHub_rows({ isOffline: false, hasRunSensors: true }).map((r) => r.id)).to.deep.equal([
      "graphs",
      "exercise-stats",
    ]);
  });
});
