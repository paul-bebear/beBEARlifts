import "mocha";
import { expect } from "chai";
import {
  IOnboardingState,
  Onboarding_canGoBack,
  Onboarding_empty,
  Onboarding_mainAction,
  Onboarding_progress,
  Onboarding_reduce,
  Onboarding_selectedCard,
} from "../src/models/onboarding";
import { IOnboardingEvent, Onboarding_canSkip, Onboarding_inviteToSave } from "../src/models/onboarding";
import { IOnboardingStepDef } from "../src/models/onboardingSteps";
import { IHistoryRecord } from "../src/types";

const steps: IOnboardingStepDef[] = [
  { id: "start", kind: "signIn", variant: "start", bear: "normal", say: "Hi" },
  {
    id: "found",
    kind: "choice",
    field: "extra",
    bear: "normal",
    say: "How?",
    options: [
      { id: "friend", label: "A friend", value: "friend" },
      { id: "other", label: "Other", value: "other" },
    ],
  },
  {
    id: "friend",
    kind: "text",
    field: "invite",
    label: "Handle",
    bear: "normal",
    say: "Who?",
    when: (ctx) => ctx.extras.found?.[0] === "friend",
  },
  {
    id: "source",
    kind: "choice",
    field: "source",
    bear: "normal",
    say: "Plan?",
    options: [
      { id: "recommend", label: "Build me one", value: "recommend" },
      { id: "import", label: "I have my own", value: "import" },
    ],
  },
  {
    id: "places",
    kind: "choice",
    field: "places",
    multi: true,
    bear: "normal",
    say: "Where?",
    options: [
      { id: "gym", label: "Gym", value: "gym" },
      { id: "dumbbells", label: "Dumbbells", value: "dumbbells" },
    ],
  },
  {
    id: "experience",
    kind: "choice",
    field: "experience",
    bear: "normal",
    say: "How long?",
    options: [
      { id: "never", label: "Never", value: "new" },
      { id: "tried", label: "Tried", value: "new" },
      { id: "months", label: "Months", value: "months" },
    ],
  },
  { id: "promise", kind: "hold", title: "Promise", holdMs: 10, bear: "pumped", say: "" },
  { id: "plans", kind: "plans", bear: "pumped", say: "Plan", when: (ctx) => ctx.source !== "import" },
  { id: "after", kind: "say", bear: "normal", say: "After" },
  { id: "end", kind: "say", bear: "pumped", say: "Go" },
];

const result = { answer: { builtin: "fierce-5", renamed: [], note: "" }, name: "Fierce 5", days: 3 };

function run(form: IOnboardingState, ...events: IOnboardingEvent[]): IOnboardingState {
  return events.reduce(Onboarding_reduce, form);
}

function at(form: IOnboardingState): string {
  return form.at.phase === "flow" ? form.at.id : form.at.phase;
}

function started(signedIn: boolean = false): IOnboardingState {
  return run(Onboarding_empty({ steps, now: 0 }), { type: "auth", signedIn });
}

function toSource(signedIn: boolean = false): IOnboardingState {
  return run(started(signedIn), { type: "choose", optionId: "other" }, { type: "next" });
}

function toPlans(): IOnboardingState {
  return run(
    toSource(),
    { type: "choose", optionId: "recommend" },
    { type: "next" },
    { type: "choose", optionId: "gym" },
    { type: "next" },
    { type: "choose", optionId: "months" },
    { type: "next" },
    { type: "next", visit: undefined }
  );
}

function toImport(): IOnboardingState {
  return run(toSource(true), { type: "choose", optionId: "import" }, { type: "next" });
}

describe("Onboarding steps", () => {
  it("starts on the first step and moves on when the start step signs in or skips", () => {
    const form = Onboarding_empty({ steps });
    expect(at(form)).to.equal("start");
    expect(Onboarding_mainAction(form)).to.equal(undefined);
    expect(at(started())).to.equal("found");
  });

  it("needs a pick on a choice step and shows the friend step only for A friend", () => {
    const found = started();
    expect(Onboarding_reduce(found, { type: "next" })).to.equal(found);
    expect(Onboarding_mainAction(found)).to.include({ enabled: false });
    expect(at(run(found, { type: "choose", optionId: "friend" }, { type: "next" }))).to.equal("friend");
    expect(at(run(found, { type: "choose", optionId: "other" }, { type: "next" }))).to.equal("source");
  });

  it("skips the friend step again after Back changes the answer", () => {
    const friend = run(started(), { type: "choose", optionId: "friend" }, { type: "next" });
    const back = run(friend, { type: "back" }, { type: "choose", optionId: "other" }, { type: "next" });
    expect(at(back)).to.equal("source");
    expect(at(Onboarding_reduce(back, { type: "back" }))).to.equal("found");
  });

  it("maps two options to one answer but remembers which one was picked", () => {
    const tried = run(toSource(), { type: "choose", optionId: "recommend" }, { type: "next" });
    const experience = run(
      tried,
      { type: "choose", optionId: "gym" },
      { type: "next" },
      { type: "choose", optionId: "tried" }
    );
    expect(experience.answers.experience).to.equal("new");
    expect(experience.extras.experience).to.deep.equal(["tried"]);
  });

  it("keeps extras out of the answers sent to the import API", () => {
    const form = toSource();
    expect(form.extras.found).to.deep.equal(["other"]);
    expect(Object.keys(form.answers)).to.not.include("found");
    expect(Object.keys(form.answers)).to.not.include("extras");
  });

  it("drops a hold or loading event from a step the user already left", () => {
    const promise = run(
      toSource(),
      { type: "choose", optionId: "recommend" },
      { type: "next" },
      { type: "choose", optionId: "gym" },
      { type: "next" },
      { type: "choose", optionId: "months" },
      { type: "next" }
    );
    expect(at(promise)).to.equal("promise");
    const stale = promise.visit;
    const back = Onboarding_reduce(promise, { type: "back" });
    expect(Onboarding_reduce(back, { type: "next", visit: stale })).to.equal(back);
    expect(at(Onboarding_reduce(promise, { type: "next", visit: stale }))).to.equal("plans");
  });

  it("keeps the picked plan after leaving the plans step, and applies it from the last step", () => {
    let form = toPlans();
    expect(at(form)).to.equal("plans");
    expect(Onboarding_selectedCard(form)?.recommended).to.equal(true);
    form = run(form, { type: "pick", days: 5 }, { type: "next" }, { type: "next" });
    expect(at(form)).to.equal("end");
    expect(Onboarding_selectedCard(form)?.days).to.equal(5);
    expect(Onboarding_mainAction(form)?.label).to.equal("Start my first workout");
    form = Onboarding_reduce(form, { type: "next" });
    expect(form.command).to.equal("apply");
    expect(Onboarding_reduce(form, { type: "back" })).to.equal(form);
  });

  it("keeps the pick through Back and derives fresh cards after an answer changes", () => {
    const plans = Onboarding_reduce(toPlans(), { type: "pick", days: 3 });
    const back = run(plans, { type: "back" }, { type: "back" });
    expect(back.pickedDays).to.equal(3);
    const changed = Onboarding_reduce(back, { type: "answers", patch: { experience: "years" } });
    expect(Onboarding_selectedCard(changed)?.days).to.equal(3);
    expect(Onboarding_selectedCard({ ...changed, pickedDays: undefined })?.days).to.equal(5);
  });

  it("blocks import without sign-in and opens the import screens with it", () => {
    const blocked = run(toSource(false), { type: "choose", optionId: "import" }, { type: "next" });
    expect(at(blocked)).to.equal("source");
    expect(blocked.error).to.include("sign-in");
    const form = toImport();
    expect(at(form)).to.equal("import");
    expect(Onboarding_mainAction(form)?.label).to.equal("Build my plan");
    expect(at(Onboarding_reduce(form, { type: "back" }))).to.equal("source");
    const working = Onboarding_reduce(form, { type: "next" });
    expect(working).to.include({ command: "prepare" });
    expect(at(working)).to.equal("working");
    expect(Onboarding_reduce(working, { type: "next" })).to.equal(working);
    const failed = Onboarding_reduce(working, { type: "failed", error: "Bad plan" });
    expect(failed).to.include({ error: "Bad plan", command: undefined });
    expect(at(failed)).to.equal("import");
  });

  it("rejoins the flow after the plans step when the import succeeds, and applies the imported plan", () => {
    const working = Onboarding_reduce(toImport(), { type: "next" });
    const done = Onboarding_reduce(working, { type: "ready", run: working.run, result });
    expect(at(done)).to.equal("done");
    expect(Onboarding_mainAction(done)?.label).to.equal("Continue");
    const after = Onboarding_reduce(done, { type: "next" });
    expect(at(after)).to.equal("after");
    expect(Onboarding_selectedCard(after)).to.equal(undefined);
    const applying = run(after, { type: "next" }, { type: "next" });
    expect(applying.command).to.equal("apply");
    expect(Onboarding_reduce(applying, { type: "fallback" })).to.equal(applying);
    expect(Onboarding_reduce(applying, { type: "failed", error: "Storage full" }).result).to.equal(result);
  });

  it("falls back to the plans step when a slow import is stopped, and ignores its late answer", () => {
    const working = Onboarding_reduce(toImport(), { type: "next" });
    const aiRun = working.run;
    const form = Onboarding_reduce(working, { type: "fallback" });
    expect(at(form)).to.equal("plans");
    expect(form).to.include({ source: "recommend", command: undefined, notice: undefined });
    expect(form.run).to.equal(aiRun + 1);
    expect(Onboarding_reduce(form, { type: "ready", run: aiRun, result })).to.equal(form);
    expect(Onboarding_reduce(form, { type: "failed", run: aiRun, error: "late" })).to.equal(form);
    const named = Onboarding_reduce(working, { type: "fallback", run: aiRun, reason: "No connection" });
    expect(named.notice).to.equal("Import did not finish: No connection");
  });

  it("counts only visible steps in the progress bar and never goes back past the first step", () => {
    const form = started();
    expect(Onboarding_progress(form)).to.be.closeTo(1 / 8, 0.001);
    expect(Onboarding_canGoBack(Onboarding_empty({ steps }))).to.equal(false);
    expect(Onboarding_reduce(Onboarding_empty({ steps }), { type: "back" }).at).to.deep.equal({
      phase: "flow",
      id: "start",
    });
  });

  it("refuses more than 6 screenshots and oversized totals without losing existing images", () => {
    const form = Onboarding_reduce(toImport(), { type: "images", images: ["existing"] });
    expect(Onboarding_reduce(form, { type: "images", images: new Array(6).fill("x") }).images).to.deep.equal([
      "existing",
    ]);
    expect(Onboarding_reduce(form, { type: "images", images: ["x".repeat(3_500_001)] }).error).to.include("smaller");
    const resizing = Onboarding_reduce(form, { type: "resizing" });
    expect(Onboarding_reduce(resizing, { type: "next" })).to.equal(resizing);
  });

  it("offers imported workouts with the box ticked and lets the user untick it", () => {
    const record = { id: 1, startTime: 1 } as IHistoryRecord;
    const withHistory = { ...result, history: { records: [record], customExercises: {}, duplicates: 0 } };
    const done = Onboarding_reduce(
      { ...Onboarding_empty({ steps }), importHistory: false },
      { type: "ready", result: withHistory }
    );
    expect(done.importHistory).to.equal(true);
    expect(Onboarding_reduce(done, { type: "toggleHistory" }).importHistory).to.equal(false);
  });

  it("stores a typed invite handle without the @ and in lower case", () => {
    expect(Onboarding_reduce(Onboarding_empty(), { type: "invite", value: " @Paul_K" }).invite).to.equal("paul_k");
  });

  it("moves one step when the same Next event arrives twice from one render", () => {
    const found = Onboarding_reduce(started(), { type: "choose", optionId: "other" });
    const event = Onboarding_mainAction(found)!.event;
    expect(at(run(found, event, event))).to.equal("source");
    const back = { type: "back" as const, visit: found.visit };
    const source = run(found, event);
    expect(at(run(source, { type: "back", visit: source.visit }, { type: "back", visit: source.visit }))).to.equal(
      "found"
    );
    expect(at(Onboarding_reduce(source, back))).to.equal("source");
  });

  it("skips a measure step and clears what was typed there", () => {
    const measureSteps: IOnboardingStepDef[] = [
      { id: "weight", kind: "measure", measure: "weight", bear: "normal", say: "Weight?" },
      { id: "places", kind: "choice", field: "places", multi: true, bear: "normal", say: "", options: [] },
      { id: "plans", kind: "plans", bear: "normal", say: "" },
      { id: "end", kind: "say", bear: "normal", say: "Go" },
    ];
    const form = Onboarding_reduce(Onboarding_empty({ steps: measureSteps }), {
      type: "answers",
      patch: { weight: "9999" },
    });
    expect(Onboarding_mainAction(form)?.enabled).to.equal(false);
    expect(Onboarding_canSkip(form)).to.equal(true);
    const skipped = Onboarding_reduce(form, { type: "skip", visit: form.visit });
    expect(at(skipped)).to.equal("places");
    expect(skipped.answers.weight).to.equal("");
    expect(Onboarding_canSkip(skipped)).to.equal(false);
    expect(Onboarding_reduce(skipped, { type: "skip" })).to.equal(skipped);
  });

  it("shows Build me one as picked after an import falls back", () => {
    const working = Onboarding_reduce(toImport(), { type: "next" });
    const plans = Onboarding_reduce(working, { type: "fallback" });
    expect(plans.extras.source).to.deep.equal(["recommend"]);
  });

  it("starts on the first visible step when the first entry is hidden", () => {
    const hiddenFirst: IOnboardingStepDef[] = [steps[2], ...steps.slice(3)];
    expect(at(Onboarding_empty({ steps: hiddenFirst }))).to.equal("source");
  });

  it("updates import access when sign-in changes, without leaving the step", () => {
    const form = toSource();
    const signedIn = Onboarding_reduce(form, { type: "capability", canImport: true });
    expect(signedIn.useAi).to.equal(true);
    expect(signedIn.at).to.deep.equal(form.at);
    expect(at(run(signedIn, { type: "choose", optionId: "import" }, { type: "next" }))).to.equal("import");
  });

  it("saves the friend invite only when the friend step is still shown", () => {
    const friend = run(
      started(),
      { type: "choose", optionId: "friend" },
      { type: "next" },
      { type: "invite", value: "bear_pal" }
    );
    expect(Onboarding_inviteToSave(friend)).to.equal("bear_pal");
    const changed = run(friend, { type: "back" }, { type: "choose", optionId: "other" });
    expect(Onboarding_inviteToSave(changed)).to.equal(undefined);
    const noFriendStep = Onboarding_empty({ steps: steps.filter((s) => s.id !== "friend"), invite: "link_pal" });
    expect(Onboarding_inviteToSave(noFriendStep)).to.equal("link_pal");
    expect(Onboarding_inviteToSave(Onboarding_empty({ steps }))).to.equal(undefined);
  });
});
