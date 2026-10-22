import "mocha";
import { expect } from "chai";
import {
  IOnboardingState,
  Onboarding_canGoBack,
  Onboarding_empty,
  Onboarding_mainAction,
  Onboarding_reduce,
  Onboarding_selectedCard,
} from "../src/models/onboarding";
import { IHistoryRecord } from "../src/types";

function toWant(signedIn: boolean): IOnboardingState {
  let form = Onboarding_reduce(Onboarding_empty(), { type: "auth", signedIn });
  form = Onboarding_reduce(form, { type: "answers", patch: { places: ["gym"] } });
  form = Onboarding_reduce(form, { type: "next" });
  return Onboarding_reduce(form, { type: "next" });
}

describe("Onboarding steps", () => {
  it("walks welcome, place, about, want and plan, and needs a place pick", () => {
    let form = Onboarding_reduce(Onboarding_empty(), { type: "auth", signedIn: false });
    expect(form.step).to.equal("place");
    expect(Onboarding_reduce(form, { type: "next" })).to.equal(form);
    expect(Onboarding_mainAction(form)).to.include({ label: "Pick at least one", enabled: false });
    form = Onboarding_reduce(form, { type: "answers", patch: { places: ["dumbbells"] } });
    expect(Onboarding_mainAction(form)).to.include({ label: "Next", enabled: true });
    form = Onboarding_reduce(form, { type: "next" });
    expect(form.step).to.equal("about");
    form = Onboarding_reduce(form, { type: "answers", patch: { experience: "months" } });
    form = Onboarding_reduce(form, { type: "next" });
    expect(form.step).to.equal("want");
    expect(Onboarding_mainAction(form)?.label).to.equal("Recommend a plan");
    form = Onboarding_reduce(form, { type: "recommend" });
    expect(form.step).to.equal("plan");
    expect(form.cards.map((c) => c.days)).to.deep.equal([4, 3, 5]);
    expect(Onboarding_selectedCard(form)?.recommended).to.equal(true);
    form = Onboarding_reduce(form, { type: "pick", index: 2 });
    expect(Onboarding_selectedCard(form)?.days).to.equal(5);
    expect(Onboarding_reduce(form, { type: "pick", index: 3 })).to.equal(form);
    form = Onboarding_reduce(form, { type: "start" });
    expect(form.command).to.equal("apply");
    expect(Onboarding_reduce(form, { type: "pick", index: 0 })).to.equal(form);
  });
  it("opens the import screen only after sign-in, and sends it to the AI", () => {
    expect(Onboarding_reduce(toWant(false), { type: "import" }).step).to.equal("want");
    let form = Onboarding_reduce(toWant(true), { type: "import" });
    expect(form.step).to.equal("import");
    form = Onboarding_reduce(form, { type: "next" });
    expect(form).to.include({ step: "working", command: "prepare" });
    expect(Onboarding_reduce(form, { type: "next" })).to.equal(form);
    expect(Onboarding_reduce(form, { type: "back" })).to.equal(form);
    const failed = Onboarding_reduce(form, { type: "failed", error: "Bad plan" });
    expect(failed).to.include({ step: "import", error: "Bad plan", command: undefined });
  });
  it("shows the beBEAR cards when the user stops a slow import, and ignores its late answer", () => {
    let form = Onboarding_reduce(Onboarding_reduce(toWant(true), { type: "import" }), { type: "next" });
    const aiRun = form.run;
    form = Onboarding_reduce(form, { type: "fallback" });
    expect(form).to.include({ step: "plan", command: undefined, notice: undefined });
    expect(form.cards).to.have.length(3);
    expect(form.run).to.equal(aiRun + 1);
    const result = { answer: { builtin: "fierce-5", renamed: [], note: "" }, name: "AI plan", days: 4 };
    expect(Onboarding_reduce(form, { type: "ready", run: aiRun, result })).to.equal(form);
    expect(Onboarding_reduce(form, { type: "failed", run: aiRun, error: "late" })).to.equal(form);
    expect(Onboarding_reduce(form, { type: "fallback", run: aiRun, reason: "late" })).to.equal(form);
  });
  it("names the reason when the import gives up on its own", () => {
    const form = Onboarding_reduce(Onboarding_reduce(toWant(true), { type: "import" }), { type: "next" });
    const cards = Onboarding_reduce(form, { type: "fallback", run: form.run, reason: "No connection" });
    expect(cards).to.include({ step: "plan", notice: "Import did not finish: No connection" });
  });
  it("goes back one screen at a time and never past welcome", () => {
    const want = toWant(false);
    expect(Onboarding_reduce(want, { type: "back" }).step).to.equal("about");
    const plan = Onboarding_reduce(want, { type: "recommend" });
    expect(Onboarding_reduce(plan, { type: "back" }).step).to.equal("want");
    expect(Onboarding_canGoBack(Onboarding_empty())).to.equal(false);
    expect(Onboarding_reduce(Onboarding_empty(), { type: "back" }).step).to.equal("welcome");
  });
  it("refuses more than 6 screenshots and oversized totals without losing existing images", () => {
    const form = Onboarding_reduce(Onboarding_empty(), { type: "images", images: ["existing"] });
    expect(Onboarding_reduce(form, { type: "images", images: new Array(6).fill("x") }).images).to.deep.equal([
      "existing",
    ]);
    expect(Onboarding_reduce(form, { type: "images", images: ["x".repeat(3_500_001)] }).error).to.include("smaller");
    const resizing = Onboarding_reduce({ ...form, step: "import" }, { type: "resizing" });
    expect(Onboarding_reduce(resizing, { type: "next" })).to.equal(resizing);
  });
  it("shows the imported plan before applying, and keeps it if saving fails", () => {
    const result = { answer: { builtin: "fierce-5", renamed: [], note: "" }, name: "Fierce 5", days: 3 };
    const done = Onboarding_reduce(Onboarding_empty(), { type: "ready", result });
    expect(done).to.include({ step: "done", command: undefined });
    expect(Onboarding_mainAction(done)?.label).to.equal("Start");
    const applying = Onboarding_reduce(done, { type: "start" });
    expect(applying.command).to.equal("apply");
    expect(Onboarding_reduce(applying, { type: "fallback" })).to.equal(applying);
    expect(Onboarding_reduce(applying, { type: "failed", error: "Storage full" }).result).to.equal(result);
  });
  it("offers imported workouts with the box ticked and lets the user untick it", () => {
    const record = { id: 1, startTime: 1 } as IHistoryRecord;
    const result = {
      answer: { builtin: "fierce-5", renamed: [], note: "" },
      name: "Fierce 5",
      days: 3,
      history: { records: [record], customExercises: {}, duplicates: 0 },
    };
    const done = Onboarding_reduce({ ...Onboarding_empty(), importHistory: false }, { type: "ready", result });
    expect(done.importHistory).to.equal(true);
    expect(Onboarding_reduce(done, { type: "toggleHistory" }).importHistory).to.equal(false);
  });
  it("stores a typed invite handle without the @ and in lower case", () => {
    expect(Onboarding_reduce(Onboarding_empty(), { type: "invite", value: " @Paul_K" }).invite).to.equal("paul_k");
  });
});
