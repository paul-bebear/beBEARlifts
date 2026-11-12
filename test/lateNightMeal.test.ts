import "mocha";
import { expect } from "chai";
import {
  LateNightMeal_isLate,
  LateNightMeal_question,
  LateNightMeal_targets,
  LateNightMeal_windowHours,
} from "../src/models/lateNightMeal";

function at(day: number, hours: number, minutes: number): number {
  return new Date(2026, 9, day, hours, minutes).getTime();
}

describe("LateNightMeal_targets", () => {
  it("gives one target at 23:59 and at 04:00", () => {
    for (const now of [at(12, 23, 59), at(13, 4, 0), at(13, 12, 0)]) {
      expect(LateNightMeal_targets(now).targets).to.have.length(1);
      expect(LateNightMeal_targets(now).question).to.equal(undefined);
    }
  });

  it("gives two targets at 00:00 and at 03:59", () => {
    for (const now of [at(13, 0, 0), at(13, 3, 59)]) {
      const choice = LateNightMeal_targets(now);
      expect(choice.targets).to.have.length(2);
      expect(choice.question).to.equal(LateNightMeal_question);
      expect(choice.targets.map((t) => t.label)).to.deep.equal(["Last night", "Today"]);
    }
  });

  it("logs Last night at 01:00 on the 13th as dinner on the 12th", () => {
    const [lastNight] = LateNightMeal_targets(at(13, 1, 0)).targets;
    expect(lastNight).to.deep.equal({ label: "Last night", day: "2026-10-12", meal: "dinner" });
  });

  it("logs Today at 01:00 on the 13th as the 13th with the meal the clock picks", () => {
    const today = LateNightMeal_targets(at(13, 1, 0)).targets[1];
    expect(today).to.deep.equal({ label: "Today", day: "2026-10-13", meal: "breakfast" });
  });

  it("crosses a month end for Last night", () => {
    const [lastNight] = LateNightMeal_targets(new Date(2026, 10, 1, 2, 0).getTime()).targets;
    expect(lastNight.day).to.equal("2026-10-31");
  });

  it("keeps the single target as today's day and the clock's meal outside the window", () => {
    expect(LateNightMeal_targets(at(13, 19, 0)).targets).to.deep.equal([
      { label: "Today", day: "2026-10-13", meal: "dinner" },
    ]);
  });

  it("asks nothing when the page shows another day, even at 01:00", () => {
    const choice = LateNightMeal_targets(at(13, 1, 0), "2026-10-10");
    expect(choice.question).to.equal(undefined);
    expect(choice.targets).to.deep.equal([{ label: "Today", day: "2026-10-10", meal: "breakfast" }]);
  });

  it("asks when the page shows today, given as a day key", () => {
    expect(LateNightMeal_targets(at(13, 1, 0), "2026-10-13").targets).to.have.length(2);
  });

  it("uses a four-hour window", () => {
    expect(LateNightMeal_windowHours).to.equal(4);
    expect(LateNightMeal_isLate(at(13, 3, 59))).to.equal(true);
    expect(LateNightMeal_isLate(at(13, 4, 0))).to.equal(false);
  });
});
