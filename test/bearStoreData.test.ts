import "mocha";
import { expect } from "chai";
import { BearStoreData_empty, BearStoreData_parse } from "../src/models/bearStoreData";

describe("BearStoreData hibernation", () => {
  const base = {
    line: "female",
    celebratedLevel: 4,
    seenBadges: ["first"],
    spent: 50,
    seeded: true,
    badgesSeeded: true,
  };

  it("keeps valid fields and reads an old store with empty hibernation data", () => {
    expect(BearStoreData_parse(base)).to.deep.equal({ ...base, passes: 0, coveredDays: [] });
    expect(BearStoreData_empty()).to.include({ passes: 0, spent: 0 });
  });

  it("clamps passes above two and resets invalid counts without losing other fields", () => {
    expect(BearStoreData_parse({ ...base, passes: 8 }).passes).to.equal(2);
    for (const passes of [-1, 1.5, Infinity, NaN, "2", null]) {
      expect(BearStoreData_parse({ ...base, passes })).to.deep.equal({ ...base, passes: 0, coveredDays: [] });
    }
  });

  it("drops bad day keys, deduplicates and sorts", () => {
    const coveredDays = ["2026-10-21", 1, null, "bad", "2026-1-01", "2026-10-20", "2026-10-21"];
    expect(BearStoreData_parse({ ...base, coveredDays }).coveredDays).to.deep.equal(["2026-10-20", "2026-10-21"]);
    expect(BearStoreData_parse({ ...base, coveredDays: "bad" }).spent).to.equal(50);
    expect(BearStoreData_parse({ ...base, coveredDays: "bad" }).coveredDays).to.deep.equal([]);
  });

  it("retains the latest 400 covered days", () => {
    const coveredDays = Array.from({ length: 405 }, (_, i) => new Date(2020, 0, i + 1).toISOString().slice(0, 10));
    expect(BearStoreData_parse({ ...base, coveredDays }).coveredDays).to.deep.equal(coveredDays.slice(-400));
  });

  it("parses and copies a pending wake", () => {
    const pendingWake = { days: ["2026-10-21"], streak: 12 };
    const parsed = BearStoreData_parse({ ...base, passes: 1, coveredDays: pendingWake.days, pendingWake });
    expect(parsed.pendingWake).to.deep.equal(pendingWake);
    expect(parsed.pendingWake).not.to.equal(pendingWake);
    expect(parsed.pendingWake?.days).not.to.equal(pendingWake.days);
  });

  it("drops malformed wake data without losing passes or spending", () => {
    for (const pendingWake of [
      null,
      [],
      "bad",
      {},
      { days: [], streak: 3 },
      { days: ["bad"], streak: 3 },
      { days: ["2026-10-21"], streak: -1 },
      { days: ["2026-10-21"], streak: 1.5 },
    ]) {
      expect(BearStoreData_parse({ ...base, passes: 1, pendingWake })).to.deep.equal({
        ...base,
        passes: 1,
        coveredDays: [],
      });
    }
  });
});
