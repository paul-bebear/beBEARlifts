import "mocha";
import { expect } from "chai";
import { DayClock_msToMidnight, DayClock_refresh, DayClock_start } from "../src/models/dayKey";

const evening = new Date(2026, 10, 18, 22).getTime();
const morning = new Date(2026, 10, 19, 7).getTime();

describe("DayClock", () => {
  it("starts on the local day with tick 0", () => {
    expect(DayClock_start(evening)).to.deep.equal({ dayKey: "2026-11-18", tick: 0 });
  });

  it("counts every refresh so the bear mood recomputes within the same day", () => {
    const later = new Date(2026, 10, 18, 23).getTime();
    expect(DayClock_refresh(DayClock_start(evening), later)).to.deep.equal({ dayKey: "2026-11-18", tick: 1 });
  });

  it("moves to the new day on a refresh after midnight", () => {
    const next = DayClock_refresh(DayClock_start(evening), morning);
    expect(next).to.deep.equal({ dayKey: "2026-11-19", tick: 1 });
  });

  it("gives the milliseconds to the next local midnight", () => {
    expect(DayClock_msToMidnight(evening)).to.equal(2 * 3600000);
    expect(DayClock_msToMidnight(new Date(2026, 10, 18, 0, 0, 0).getTime())).to.equal(24 * 3600000);
  });
});
