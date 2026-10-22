import "mocha";
import { expect } from "chai";
import { TodayPill_text } from "../src/models/todayPill";

const now = new Date(2026, 9, 22, 12).getTime();

describe("TodayPill", () => {
  it("adds an exclamation mark to the next day's name", () => {
    expect(TodayPill_text("Legs", [], now)).to.equal("Legs!");
  });

  it("trims whitespace and repeated trailing punctuation", () => {
    expect(TodayPill_text("  Upper A!!!  ", [], now)).to.equal("Upper A!");
    expect(TodayPill_text("Push?", [], now)).to.equal("Push!");
  });

  it("shows Rest day without a program day", () => {
    expect(TodayPill_text(undefined, [], now)).to.equal("Rest day");
  });

  it("shows Rest day for names without letters", () => {
    for (const name of ["", "   ", "123", "💪", "!?..."]) {
      expect(TodayPill_text(name, [], now)).to.equal("Rest day");
    }
  });

  it("keeps letters from non-English day names", () => {
    expect(TodayPill_text("Épaules", [], now)).to.equal("Épaules!");
    expect(TodayPill_text("脚", [], now)).to.equal("脚!");
  });

  it("shows Rest day after a finished workout today", () => {
    expect(TodayPill_text("Legs", [{ startTime: new Date(2026, 9, 22, 8).getTime() }], now)).to.equal("Rest day");
  });

  it("keeps the next day after yesterday's workout", () => {
    expect(TodayPill_text("Legs", [{ startTime: new Date(2026, 9, 21, 23).getTime() }], now)).to.equal("Legs!");
  });

  it("uses the local calendar day near midnight", () => {
    const late = new Date(2026, 9, 22, 23, 59).getTime();
    expect(TodayPill_text("Legs", [{ startTime: late }], late)).to.equal("Rest day");
    expect(TodayPill_text("Legs", [{ startTime: late }], new Date(2026, 9, 23, 0, 1).getTime())).to.equal("Legs!");
  });
});
