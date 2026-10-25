import "mocha";
import { expect } from "chai";
import {
  OnboardingChoices_dayLabel,
  OnboardingChoices_days,
  OnboardingChoices_places,
  OnboardingChoices_welcomeLabel,
} from "../src/models/onboardingChoices";

describe("OnboardingChoices", () => {
  it("labels the welcome button Start when signed out and Continue when signed in", () => {
    expect(OnboardingChoices_welcomeLabel(false)).to.equal("Start");
    expect(OnboardingChoices_welcomeLabel(true)).to.equal("Continue");
  });

  it("shows the last day count as 6+", () => {
    expect(OnboardingChoices_days.map(OnboardingChoices_dayLabel)).to.deep.equal(["2", "3", "4", "5", "6+"]);
  });

  it("offers each place once", () => {
    const picks = OnboardingChoices_places.map((p) => p.pick);
    expect(new Set(picks).size).to.equal(picks.length);
  });
});
