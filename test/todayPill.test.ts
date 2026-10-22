import "mocha";
import { expect } from "chai";
import { TodayPill_dayName, TodayPill_text } from "../src/models/todayPill";

const at = (day: string, hour: number = 8): number => {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(y, m - 1, d, hour).getTime();
};

const now = at("2026-10-22", 12);

describe("TodayPill", () => {
  it("adds an exclamation mark to the next day's name", () => {
    expect(TodayPill_text({ dayName: "Legs", history: [], now })).to.equal("Legs!");
    expect(TodayPill_text({ dayName: "  Upper   body ", history: [], now })).to.equal("Upper body!");
  });

  it("keeps a name that already ends in punctuation", () => {
    expect(TodayPill_text({ dayName: "Legs!", history: [], now })).to.equal("Legs!");
  });

  it("says Rest day with no program or an empty name", () => {
    expect(TodayPill_text({ history: [], now })).to.equal("Rest day");
    expect(TodayPill_text({ dayName: "   ", history: [], now })).to.equal("Rest day");
  });

  it("falls back to Workout! when the name has no letters", () => {
    expect(TodayPill_text({ dayName: "3", history: [], now })).to.equal("Workout!");
    expect(TodayPill_text({ dayName: "—", history: [], now })).to.equal("Workout!");
  });

  it("names today's scheduled day, says Rest day on a rest weekday, and falls back to the next day", () => {
    const today = { kind: "day" as const, weekday: 3, day: 3, name: "Push" };
    expect(TodayPill_text({ dayName: TodayPill_dayName(today, "Upper"), history: [], now })).to.equal("Push!");
    const rest = { kind: "rest" as const, weekday: 2 };
    expect(TodayPill_text({ dayName: TodayPill_dayName(rest, "Push"), history: [], now })).to.equal("Rest day");
    const none = { kind: "none" as const, weekday: 3 };
    expect(TodayPill_dayName(none, "Upper")).to.equal("Upper");
  });

  it("says Done today after a workout on a rest weekday too", () => {
    const rest = { kind: "rest" as const, weekday: 3 };
    const history = [{ startTime: at("2026-10-22", 7) }];
    expect(TodayPill_text({ dayName: TodayPill_dayName(rest, "Push"), history, now })).to.equal("Done today");
  });

  it("says Done today after a workout today, and ignores an older one", () => {
    expect(TodayPill_text({ dayName: "Legs", history: [{ startTime: at("2026-10-22", 7) }], now })).to.equal(
      "Done today"
    );
    expect(TodayPill_text({ dayName: "Legs", history: [{ startTime: at("2026-10-21", 23) }], now })).to.equal("Legs!");
  });
});
