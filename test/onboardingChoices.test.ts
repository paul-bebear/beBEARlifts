import "mocha";
import { expect } from "chai";
import {
  OnboardingChoices_dayLabel,
  OnboardingChoices_days,
  OnboardingChoices_places,
  OnboardingChoices_welcomeLine,
} from "../src/models/onboardingChoices";

describe("OnboardingChoices", () => {
  it("gives the cub number as the reason to sign in, then names the number", () => {
    expect(OnboardingChoices_welcomeLine(false, undefined)).to.equal("Sign in to get your cub number");
    expect(OnboardingChoices_welcomeLine(false, 412)).to.equal("Sign in to get your cub number");
    expect(OnboardingChoices_welcomeLine(true, undefined)).to.equal("Getting your cub number…");
    expect(OnboardingChoices_welcomeLine(true, 412)).to.equal("You are Cub 412.");
    expect(OnboardingChoices_welcomeLine(true, 0)).to.equal("You are Cub 0.");
  });

  it("shows the last day count as 6+", () => {
    expect(OnboardingChoices_days.map(OnboardingChoices_dayLabel)).to.deep.equal(["2", "3", "4", "5", "6+"]);
  });

  it("offers each place once", () => {
    const picks = OnboardingChoices_places.map((p) => p.pick);
    expect(new Set(picks).size).to.equal(picks.length);
  });
});
