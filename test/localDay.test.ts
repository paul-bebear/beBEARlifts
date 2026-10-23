import "mocha";
import { expect } from "chai";
import { LocalDay_between, LocalDay_start } from "../src/models/localDay";

describe("LocalDay", () => {
  it("starts the day at local midnight", () => {
    expect(LocalDay_start(new Date(2026, 9, 22, 18, 30).getTime())).to.equal(new Date(2026, 9, 22).getTime());
  });

  it("counts calendar days, not 24-hour periods", () => {
    const lateEvening = new Date(2026, 9, 21, 23, 59).getTime();
    const earlyMorning = new Date(2026, 9, 22, 0, 1).getTime();
    expect(LocalDay_between(lateEvening, earlyMorning)).to.equal(1);
    expect(LocalDay_between(earlyMorning, new Date(2026, 9, 22, 23, 0).getTime())).to.equal(0);
  });

  it("stays whole across a daylight-saving change", () => {
    expect(LocalDay_between(new Date(2026, 2, 1, 12).getTime(), new Date(2026, 3, 1, 12).getTime())).to.equal(31);
    expect(LocalDay_between(new Date(2026, 9, 1, 12).getTime(), new Date(2026, 10, 15, 12).getTime())).to.equal(45);
  });
});
