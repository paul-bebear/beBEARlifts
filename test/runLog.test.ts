import "mocha";
import { expect } from "chai";
import {
  IRun,
  RunLog_empty,
  RunLog_fastestSplit,
  RunLog_pace,
  RunLog_parse,
  RunLog_put,
  RunLog_remove,
  RunLog_splitBars,
} from "../src/models/runLog";

const run: IRun = {
  id: 1,
  startedAt: 1,
  endedAt: 700001,
  distanceM: 2000,
  movingMs: 700000,
  elevationGainM: 10,
  splits: [
    { km: 1, ms: 300000 },
    { km: 2, ms: 400000 },
  ],
  route: [
    [
      [40, -3],
      [40.01, -3],
    ],
  ],
};

describe("RunLog", () => {
  it("round trips runs and replaces IDs in newest-first order", () => {
    const log = RunLog_put(RunLog_put(RunLog_empty(), run), { ...run, id: 2, startedAt: 2 });
    expect(RunLog_parse(JSON.parse(JSON.stringify(log)))).to.deep.equal(log);
    expect(RunLog_put(log, { ...run, distanceM: 2100 }).runs.map((r) => r.id)).to.deep.equal([2, 1]);
    expect(RunLog_remove(log, 2).runs).to.deep.equal([run]);
    expect(RunLog_parse({ runs: [null, { id: "x" }, run] }).runs).to.deep.equal([run]);
    expect(RunLog_parse(undefined)).to.deep.equal(RunLog_empty());
  });

  it("computes pace and gives the fastest split the full bar", () => {
    expect(RunLog_pace(run)).to.equal(350);
    expect(RunLog_fastestSplit(run)).to.deep.equal({ km: 1, ms: 300000 });
    expect(RunLog_splitBars(run.splits)).to.deep.equal([1, 0.75]);
    expect(RunLog_splitBars([])).to.deep.equal([]);
  });
});
