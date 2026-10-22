import "mocha";
import { expect } from "chai";
import {
  IOnboardingState,
  Onboarding_current,
  Onboarding_empty,
  Onboarding_reduce,
  Onboarding_selectedCard,
} from "../src/models/onboarding";
import { OnboardingStepList_all } from "../src/models/onboardingStepList";
import {
  IOnboardingChoiceStep,
  IOnboardingContext,
  IOnboardingStepDef,
  OnboardingSteps_check,
  OnboardingSteps_choose,
  OnboardingSteps_forecast,
  OnboardingSteps_liftKg,
  OnboardingSteps_progress,
  OnboardingSteps_text,
  OnboardingSteps_visible,
} from "../src/models/onboardingSteps";
import { OnboardingAnswers_empty } from "../src/models/onboardingAnswers";

const now = Date.UTC(2026, 9, 23);

function ctx(patch: Partial<IOnboardingContext> = {}): IOnboardingContext {
  return {
    answers: OnboardingAnswers_empty(),
    extras: {},
    source: "recommend",
    invite: "",
    platform: "web",
    now,
    ...patch,
  };
}

function choice(id: string): IOnboardingChoiceStep {
  const step = OnboardingStepList_all.find((s) => s.id === id);
  if (step?.kind !== "choice") {
    throw new Error(`${id} is not a choice step`);
  }
  return step;
}

function answerCurrent(form: IOnboardingState): IOnboardingState {
  const step = Onboarding_current(form);
  if (step == null) {
    return form;
  }
  switch (step.kind) {
    case "signIn":
      return step.variant === "start"
        ? Onboarding_reduce(form, { type: "auth", signedIn: false })
        : Onboarding_reduce(form, { type: "next" });
    case "choice": {
      const count = step.field === "extra" && step.min != null ? step.min(ctx({ answers: form.answers })) : 1;
      const picked = step.options
        .slice(0, Math.max(1, count))
        .reduce((next, option) => Onboarding_reduce(next, { type: "choose", optionId: option.id }), form);
      return Onboarding_reduce(picked, { type: "next" });
    }
    case "measure": {
      const patch =
        step.measure === "age"
          ? { age: "19" }
          : step.measure === "height"
            ? { heightUnit: "cm" as const, height: "178" }
            : { unit: "kg" as const, weight: "64" };
      return Onboarding_reduce(Onboarding_reduce(form, { type: "answers", patch }), { type: "next" });
    }
    default:
      return Onboarding_reduce(form, { type: "next", visit: form.visit });
  }
}

function walk(
  steps: readonly IOnboardingStepDef[],
  platform: IOnboardingContext["platform"] = "web"
): { form: IOnboardingState; seen: string[] } {
  let form = Onboarding_empty({ steps, platform, now });
  const seen: string[] = [];
  for (let i = 0; i < 200 && form.command == null; i++) {
    const step = Onboarding_current(form);
    if (step == null) {
      break;
    }
    seen.push(step.id);
    const next = answerCurrent(form);
    if (next === form) {
      throw new Error(`Stuck on step "${step.id}": ${form.error ?? "Next did nothing"}`);
    }
    form = next;
  }
  return { form, seen };
}

describe("Onboarding step list", () => {
  it("passes its own checks", () => {
    expect(OnboardingSteps_check(OnboardingStepList_all)).to.deep.equal([]);
  });

  it("walks from the first step to apply with a picked plan on the web", () => {
    const { form, seen } = walk(OnboardingStepList_all);
    expect(form.command).to.equal("apply");
    expect(Onboarding_selectedCard(form)).to.not.equal(undefined);
    expect(seen).to.include("plans");
    expect(seen).to.not.include("widgetHold");
    expect(seen).to.not.include("health");
    expect(form.answers).to.include({ age: "19", height: "178", weight: "64" });
  });

  it("shows the iPhone-only steps in the iPhone app", () => {
    const { seen } = walk(OnboardingStepList_all, "ios");
    expect(seen).to.include.members(["widgetHold", "widgetEdit", "widgetAdd", "health"]);
  });

  it("still reaches apply after every step that only writes an extra is deleted", () => {
    const trimmed = OnboardingStepList_all.filter(
      (step) =>
        !(step.kind === "choice" && step.field === "extra") &&
        step.kind !== "lift" &&
        !(step.kind === "text" && step.field === "extra")
    );
    expect(OnboardingSteps_check(trimmed)).to.deep.equal([]);
    expect(walk(trimmed).form.command).to.equal("apply");
  });

  it("names the step that trimming broke", () => {
    const noPlans = OnboardingStepList_all.filter((step) => step.kind !== "plans" && step.id !== "places");
    expect(OnboardingSteps_check(noPlans)).to.have.length(2);
    const doubled = [...OnboardingStepList_all, OnboardingStepList_all[0]];
    expect(OnboardingSteps_check(doubled)[0]).to.include('"start"');
  });

  it("refuses a list that asks for the plan source before the equipment", () => {
    const places = OnboardingStepList_all.find((s) => s.id === "places")!;
    const moved = [...OnboardingStepList_all.filter((s) => s.id !== "places"), places];
    expect(OnboardingSteps_check(moved).join(" ")).to.include("never asks for equipment");
  });

  it("refuses a list whose last step has no button to retry a failed save", () => {
    const loading = OnboardingStepList_all.find((s) => s.kind === "loading")!;
    const endsLoading = [...OnboardingStepList_all.filter((s) => s.id !== loading.id), loading];
    expect(OnboardingSteps_check(endsLoading).join(" ")).to.include("no button");
  });

  it("asks for equipment before an import starts", () => {
    const ids = OnboardingStepList_all.map((s) => s.id);
    expect(ids.indexOf("places")).to.be.lessThan(ids.indexOf("source"));
  });

  it("shows the creator question only after Instagram or TikTok and a creator", () => {
    const visible = (extras: Record<string, string[]>): string[] =>
      OnboardingSteps_visible(OnboardingStepList_all, ctx({ extras })).map((s) => s.id);
    expect(visible({ found: ["instagram"] })).to.include("foundHow");
    expect(visible({ found: ["instagram"] })).to.not.include("creator");
    expect(visible({ found: ["tiktok"], foundHow: ["creator"] })).to.include("creator");
    expect(visible({ found: ["friend"], foundHow: ["creator"] })).to.not.include.members(["foundHow", "creator"]);
    expect(visible({ found: ["friend"] })).to.include("friend");
  });

  it("toggles multi choices, and an only option clears the others", () => {
    const step = choice("hurts");
    const first = OnboardingSteps_choose(step, ctx(), "knees");
    const two = OnboardingSteps_choose(step, ctx({ extras: { hurts: first.extra.value } }), "back");
    expect(two.extra.value).to.deep.equal(["knees", "back"]);
    const nothing = OnboardingSteps_choose(step, ctx({ extras: { hurts: two.extra.value } }), "nothing");
    expect(nothing.extra.value).to.deep.equal(["nothing"]);
    const again = OnboardingSteps_choose(step, ctx({ extras: { hurts: ["nothing"] } }), "knees");
    expect(again.extra.value).to.deep.equal(["knees"]);
    expect(OnboardingSteps_choose(step, ctx({ extras: { hurts: ["knees"] } }), "knees").extra.value).to.deep.equal([]);
  });

  it("writes typed answers for the places, sex and food steps", () => {
    const places = OnboardingSteps_choose(choice("places"), ctx({ extras: { places: ["gym"] } }), "street");
    expect(places.answers).to.deep.equal({ places: ["gym", "street"] });
    expect(OnboardingSteps_choose(choice("sex"), ctx(), "skip").answers).to.deep.equal({ sex: undefined });
    expect(OnboardingSteps_choose(choice("foodGoal"), ctx(), "gain").answers).to.deep.equal({ foodGoal: "gain" });
    expect(OnboardingSteps_choose(choice("source"), ctx(), "import").source).to.equal("import");
    expect(OnboardingSteps_choose(choice("days"), ctx(), "missing").extra.value).to.deep.equal([]);
  });

  it("asks for at least as many weekdays as training days", () => {
    const answers = { ...OnboardingAnswers_empty(), days: 4 as const };
    const step = choice("weekdays");
    expect(OnboardingSteps_text(step.say, ctx({ answers }))).to.include("at least 4");
    const { form } = walk(OnboardingStepList_all);
    expect(form.extras.weekdays?.length ?? 0).to.be.at.least(form.answers.days ?? 1);
  });

  it("works out the kg of the typed set in kg and in lb", () => {
    const extras = { "lift:weight": ["60"], "lift:reps": ["8"] };
    const kg = { ...OnboardingAnswers_empty(), unit: "kg" as const };
    expect(OnboardingSteps_liftKg(ctx({ extras, answers: kg }))).to.equal(480);
    const lb = { ...OnboardingAnswers_empty(), unit: "lb" as const };
    expect(
      OnboardingSteps_liftKg(ctx({ extras: { "lift:weight": ["100"], "lift:reps": ["5"] }, answers: lb }))
    ).to.equal(227);
    expect(OnboardingSteps_liftKg(ctx({ extras: { "lift:weight": ["60"] } }))).to.equal(undefined);
  });

  it("forecasts level 5 from the session pace and the training days", () => {
    const three = OnboardingSteps_forecast(ctx(), 3);
    const five = OnboardingSteps_forecast(ctx(), 5);
    expect(three?.level.name).to.equal("Regular");
    expect(three!.date).to.be.greaterThan(five!.date);
    expect(Math.round((three!.date - now) / 86400000)).to.equal(Math.round((120000 / 6000 / 3) * 7));
    expect(OnboardingSteps_forecast(ctx(), 0)).to.equal(undefined);
  });

  it("puts the progress bar at the start and the end of the visible steps", () => {
    expect(OnboardingSteps_progress(OnboardingStepList_all, "start", ctx())).to.equal(0);
    expect(OnboardingSteps_progress(OnboardingStepList_all, "welcome", ctx())).to.equal(1);
    expect(OnboardingSteps_progress(OnboardingStepList_all, "missing", ctx())).to.equal(0);
  });
});
