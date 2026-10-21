import "mocha";
import { expect } from "chai";
import { OnboardingAnswers_empty } from "../src/models/onboardingAnswers";
import { OnboardingPicker_pick } from "../src/models/onboardingPicker";
import { OnboardingCatalog_programs } from "../src/utils/onboardingCatalog";

describe("OnboardingPicker", () => {
  const defaults = OnboardingAnswers_empty();
  it("picks Fierce 5 when every answer is skipped", () => {
    expect(OnboardingPicker_pick(defaults).builtin).to.equal("fierce-5");
  });
  it("follows experience, days, available time, and goal", () => {
    expect(OnboardingPicker_pick({ ...defaults, goal: "strength", minutes: 45 }).builtin).to.equal("basicBeginner");
    expect(OnboardingPicker_pick({ ...defaults, experience: "months", days: 3 }).builtin).to.equal("gzclp");
    expect(OnboardingPicker_pick({ ...defaults, experience: "months", days: 4, minutes: 90 }).builtin).to.equal("phul");
    expect(
      OnboardingPicker_pick({ ...defaults, experience: "years", days: 4, goal: "strength", minutes: 90 }).builtin
    ).to.equal("tsa-9-week-intermediate");
    expect(OnboardingPicker_pick({ ...defaults, experience: "years", days: 5, minutes: 90 }).builtin).to.equal("phat");
  });
  it("uses equipment-compatible plans and reports schedule mismatches", () => {
    expect(OnboardingPicker_pick({ ...defaults, equipment: "bodyweight" }).builtin).to.equal("recommended-routine");
    expect(OnboardingPicker_pick({ ...defaults, equipment: "machines" }).builtin).to.equal(
      "planet-fitness-hypertrophy"
    );
    expect(OnboardingPicker_pick({ ...defaults, equipment: "dumbbells" }).builtin).to.equal("dbPpl");
    expect(OnboardingPicker_pick({ ...defaults, days: 2 }).note).to.include("3 days");
    expect(OnboardingPicker_pick({ ...defaults, goal: "lose" }).note).to.include("Food drives fat loss");
  });
  it("can supply every rule-based selection from the bundled catalog offline", () => {
    const catalog = OnboardingCatalog_programs();
    for (const experience of ["new", "months", "years"] as const) {
      for (const equipment of ["gym", "bodyweight", "machines", "dumbbells"] as const) {
        for (const days of [2, 3, 4, 5, 6]) {
          const id = OnboardingPicker_pick({ ...defaults, experience, equipment, days }).builtin;
          const program = catalog.find((p) => p.id === id);
          expect(program?.planner?.weeks.length, id).to.be.greaterThan(0);
        }
      }
    }
  });
});
