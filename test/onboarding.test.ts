import "mocha";
import { expect } from "chai";
import { Onboarding_empty, Onboarding_reduce } from "../src/models/onboarding";
import { OnboardingAnswers_body, OnboardingAnswers_empty } from "../src/models/onboardingAnswers";

describe("Onboarding steps", () => {
  it("asks three skippable questions and selects the offline command when signed out", () => {
    let form = Onboarding_reduce(Onboarding_empty(), { type: "auth", signedIn: false });
    expect(form.step).to.equal("goal");
    form = Onboarding_reduce(form, { type: "skip" });
    expect(form.step).to.equal("body");
    form = Onboarding_reduce(form, { type: "skip" });
    expect(form.step).to.equal("plan");
    form = Onboarding_reduce(form, { type: "skip" });
    expect(form).to.include({ step: "working", command: "fallback" });
    expect(form.answers).to.deep.equal(OnboardingAnswers_empty());
  });
  it("uses AI only after sign-in and prevents duplicate commands", () => {
    let form = Onboarding_reduce(Onboarding_empty(), { type: "auth", signedIn: true });
    for (let n = 0; n < 3; n++) {
      form = Onboarding_reduce(form, { type: "next" });
    }
    expect(form.command).to.equal("prepare");
    expect(Onboarding_reduce(form, { type: "next" })).to.equal(form);
    expect(Onboarding_reduce(form, { type: "manual" })).to.equal(form);
    const failed = Onboarding_reduce(form, { type: "failed", error: "No connection" });
    expect(failed).to.include({ step: "plan", error: "No connection", command: undefined });
    expect(Onboarding_reduce(failed, { type: "fallback" }).command).to.equal("fallback");
  });
  it("clears skipped answers and screenshots, retains previous questions, and supports back", () => {
    let form = Onboarding_reduce(Onboarding_empty(), { type: "auth", signedIn: true });
    form = Onboarding_reduce(form, { type: "answers", patch: { days: 5, weight: "80", plan: "My plan" } });
    form = Onboarding_reduce(form, { type: "next" });
    form = Onboarding_reduce(form, { type: "skip" });
    expect(form.answers.weight).to.equal("");
    expect(form.answers.days).to.equal(5);
    form = Onboarding_reduce(form, { type: "images", images: ["image"] });
    form = Onboarding_reduce(form, { type: "skip" });
    expect(form.images).to.deep.equal([]);
    expect(form.answers.plan).to.equal("");
  });
  it("refuses more than 6 screenshots and oversized totals without losing existing images", () => {
    const form = Onboarding_reduce(Onboarding_empty(), { type: "images", images: ["existing"] });
    expect(Onboarding_reduce(form, { type: "images", images: new Array(6).fill("x") }).images).to.deep.equal([
      "existing",
    ]);
    expect(Onboarding_reduce(form, { type: "images", images: ["x".repeat(3_500_001)] }).error).to.include("smaller");
    const resizing = Onboarding_reduce({ ...form, step: "plan" }, { type: "resizing" });
    expect(Onboarding_reduce(resizing, { type: "next" })).to.equal(resizing);
  });
  it("shows the done screen before applying, and retains it if saving fails", () => {
    const result = { answer: { builtin: "fierce-5", renamed: [], note: "" }, name: "Fierce 5", days: 3 };
    const done = Onboarding_reduce(Onboarding_empty(), { type: "ready", result });
    expect(done).to.include({ step: "done", command: undefined });
    const applying = Onboarding_reduce(done, { type: "start" });
    expect(applying.command).to.equal("apply");
    expect(Onboarding_reduce(applying, { type: "failed", error: "Storage full" }).result).to.equal(result);
  });
  it("converts supplied body details and leaves skipped fields absent", () => {
    const answers = {
      ...OnboardingAnswers_empty(),
      height: "180",
      weight: "80,5",
      unit: "kg" as const,
      age: "30",
      sex: "female" as const,
      goal: "lose" as const,
    };
    expect(OnboardingAnswers_body(answers, 2026)).to.deep.equal({
      profile: { activity: "light", goal: "lose", heightUnit: "cm", heightCm: 180, sex: "female", birthYear: 1996 },
      weight: { value: 80.5, unit: "kg" },
    });
    expect(OnboardingAnswers_body(OnboardingAnswers_empty(), 2026).weight).to.equal(undefined);
    expect(
      OnboardingAnswers_body({ ...answers, age: "-1", height: "999", weight: "NaN" }, 2026).profile.birthYear
    ).to.equal(undefined);
  });
});
