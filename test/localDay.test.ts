import "mocha";
import { expect } from "chai";
import {
  LocalDay_between,
  LocalDay_key,
  LocalDay_parse,
  LocalDay_start,
  LocalDay_weekday,
} from "../src/models/localDay";

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

  it("keys a day as local YYYY-MM-DD with zero padding", () => {
    expect(LocalDay_key(new Date(2026, 0, 5, 23, 59))).to.equal("2026-01-05");
    expect(LocalDay_key(new Date(2026, 10, 19, 0, 1))).to.equal("2026-11-19");
  });

  it("parses a day key to local noon and back", () => {
    const date = LocalDay_parse("2026-03-08");
    expect(date.getHours()).to.equal(12);
    expect(LocalDay_key(date)).to.equal("2026-03-08");
  });

  it("gives the weekday of a day key with Sunday as 0", () => {
    expect(LocalDay_weekday("2026-11-15")).to.equal(0);
    expect(LocalDay_weekday("2026-11-19")).to.equal(4);
  });
});
