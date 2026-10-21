import "mocha";
import { expect } from "chai";
import {
  GoalWizard_back,
  GoalWizard_bodyFat,
  GoalWizard_finish,
  GoalWizard_latestLengths,
  GoalWizard_measureError,
  GoalWizard_next,
  GoalWizard_pickActivity,
  GoalWizard_pickGoal,
  GoalWizard_pickMethod,
  GoalWizard_preview,
  GoalWizard_progress,
  GoalWizard_setMeasure,
  GoalWizard_setSex,
  GoalWizard_setVisual,
  GoalWizard_start,
  IGoalWizard,
  IGoalWizardContext,
} from "../src/models/goalWizard";
import { IFoodProfile } from "../src/models/foodTargets";
import { IProgramGoal } from "../src/models/programGoal";

const fullProfile: IFoodProfile = {
  activity: "moderate",
  goal: "maintain",
  heightCm: 180,
  sex: "male",
  birthYear: 1996,
};

function start(
  profile: IFoodProfile = fullProfile,
  current?: IProgramGoal,
  mode: "goal" | "pace" = "goal"
): IGoalWizard {
  return GoalWizard_start({ mode, current, profile, lengthUnit: "cm", latest: { waist: { value: 34, unit: "in" } } });
}

const ctx = (patch: Partial<IGoalWizardContext> = {}): IGoalWizardContext => ({
  now: 5000,
  year: 2026,
  profile: fullProfile,
  latestWeight: { value: 80, unit: "kg" },
  ...patch,
});

function throughToResult(w: IGoalWizard): IGoalWizard {
  let next = GoalWizard_next(w);
  next = GoalWizard_pickGoal(next, "loseFat");
  next = GoalWizard_pickActivity(next, "10to15k");
  next = GoalWizard_pickMethod(next, "visual");
  next = GoalWizard_setVisual(next, 30);
  return GoalWizard_next(next);
}

describe("GoalWizard", () => {
  it("prefills from the profile and the latest measurements", () => {
    const w = start();
    expect(w.step).to.equal("intro");
    expect(w.sex).to.equal("male");
    expect(w.visualPct).to.equal(18);
    expect(w.measure).to.deep.equal({ unit: "cm", height: "180", waist: "86.4", neck: "", hips: "" });
  });

  it("takes the newest waist, neck and hips from body measurements", () => {
    const latest = GoalWizard_latestLengths({
      weight: {},
      percentage: {},
      length: {
        waist: [
          { vtype: "stat", value: { value: 90, unit: "cm" }, timestamp: 1 },
          { vtype: "stat", value: { value: 86, unit: "cm" }, timestamp: 2 },
        ],
      },
    });
    expect(latest).to.deep.equal({ waist: { value: 86, unit: "cm" } });
  });

  it("walks the visual path and fills the progress bar", () => {
    const w = throughToResult(start());
    expect(w.step).to.equal("result");
    expect(GoalWizard_progress(w)).to.equal(1);
    expect(w.pace).to.equal("fast");
    expect(GoalWizard_progress(start())).to.equal(0);
  });

  it("stays on a step until it has an answer", () => {
    const atGoal = GoalWizard_next(start());
    expect(GoalWizard_next(atGoal)).to.equal(atGoal);
  });

  it("goes back one step and closes from the first", () => {
    const atGoal = GoalWizard_next(start());
    expect(GoalWizard_back(atGoal)?.step).to.equal("intro");
    expect(GoalWizard_back(start())).to.equal(undefined);
  });

  it("needs valid measurements before the measure step continues", () => {
    let w = GoalWizard_pickMethod(
      GoalWizard_pickActivity(GoalWizard_pickGoal(GoalWizard_next(start()), "loseFat"), "5to10k"),
      "measure"
    );
    expect(w.step).to.equal("bodyFatMeasure");
    expect(GoalWizard_measureError(w)).to.equal("Enter your height, waist and neck.");
    expect(GoalWizard_next(w)).to.equal(w);
    w = GoalWizard_setMeasure(w, { waist: "85", neck: "38" });
    expect(GoalWizard_measureError(w)).to.equal(undefined);
    expect(GoalWizard_bodyFat(w)).to.equal(16.1);
    expect(GoalWizard_next(w).step).to.equal("result");
    expect(GoalWizard_measureError(GoalWizard_setSex(w, "female"))).to.contain("hips");
  });

  it("previews pace options and new food targets", () => {
    const preview = GoalWizard_preview(throughToResult(start()), ctx());
    expect(preview.paceOptions.map((o) => [o.pace, o.isRecommended])).to.deep.equal([
      ["slow", false],
      ["moderate", false],
      ["fast", true],
    ]);
    expect(preview.paceOptions[2].detail).to.equal("Lose about 0.8 kg a week");
    expect(preview.targets?.goals.calories.min).to.be.a("number");
    expect(GoalWizard_preview(throughToResult(start()), ctx({ latestWeight: undefined })).targets).to.equal(undefined);
  });

  it("saves a new goal with the start weight, food targets and body fat", () => {
    const save = GoalWizard_finish(throughToResult(start()), ctx());
    expect(save?.goal).to.deep.equal({
      kind: "loseFat",
      pace: "fast",
      activity: "10to15k",
      startedAt: 5000,
      bodyFatPct: 30,
      bodyFatMethod: "visual",
      startWeight: { value: 80, unit: "kg" },
    });
    expect(save?.food?.profile.goal).to.equal("lose");
    expect(save?.food?.profile.activity).to.equal("active");
    expect(save?.bodyFatPct).to.equal(30);
  });

  it("skips the food update when the user turns it off", () => {
    const w = { ...throughToResult(start()), updateTargets: false };
    expect(GoalWizard_finish(w, ctx())?.food).to.equal(undefined);
  });

  it("changes only the pace in pace mode and keeps the start", () => {
    const current: IProgramGoal = {
      kind: "buildMuscle",
      pace: "slow",
      activity: "5to10k",
      startedAt: 100,
      bodyFatPct: 14,
      startWeight: { value: 70, unit: "kg" },
    };
    const w = start(fullProfile, current, "pace");
    expect(w.step).to.equal("result");
    expect(GoalWizard_back(w)).to.equal(undefined);
    const save = GoalWizard_finish({ ...w, pace: "fast", updateTargets: false }, ctx({ current }));
    expect(save).to.deep.equal({ goal: { ...current, pace: "fast" } });
  });

  it("opens the full wizard when the goal is maintain", () => {
    const current: IProgramGoal = { kind: "maintain", activity: "5to10k", startedAt: 100 };
    expect(start(fullProfile, current, "pace").mode).to.equal("goal");
  });

  it("saves maintain without a pace", () => {
    let w = GoalWizard_pickGoal(GoalWizard_next(start()), "maintain");
    w = GoalWizard_next(GoalWizard_pickMethod(GoalWizard_pickActivity(w, "under5k"), "visual"));
    const save = GoalWizard_finish(w, ctx());
    expect(save?.goal.kind).to.equal("maintain");
    expect(save?.goal.pace).to.equal(undefined);
  });
});
