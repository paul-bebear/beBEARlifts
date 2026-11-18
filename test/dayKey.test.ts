import "mocha";
import { expect } from "chai";
import { DayKey_at, DayKey_next } from "../src/models/dayKey";

describe("DayKey", () => {
  it("names the local day", () => {
    expect(DayKey_at(new Date(2026, 10, 18, 23, 59).getTime())).to.equal("2026-11-18");
    expect(DayKey_at(new Date(2026, 10, 19, 0, 1).getTime())).to.equal("2026-11-19");
  });

  it("moves to the new day after midnight and stays on the same day before it", () => {
    const evening = new Date(2026, 10, 18, 22).getTime();
    const morning = new Date(2026, 10, 19, 7).getTime();
    expect(DayKey_next("2026-11-18", evening)).to.equal("2026-11-18");
    expect(DayKey_next("2026-11-18", morning)).to.equal("2026-11-19");
  });
});
