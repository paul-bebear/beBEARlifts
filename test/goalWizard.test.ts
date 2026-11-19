import "mocha";
import { expect } from "chai";
import {
  GoalWizard_back,
  GoalWizard_bodyFat,
  GoalWizard_finish,
  GoalWizard_latestLengths,
  GoalWizard_measureError,
  GoalWizard_canContinue,
  GoalWizard_next,
  GoalWizard_pickActivity,
  GoalWizard_pickGoal,
  GoalWizard_pickMethod,
  GoalWizard_preview,
  GoalWizard_progress,
  GoalWizard_runSave,
  GoalWizard_setMeasure,
  GoalWizard_setSex,
  GoalWizard_setVisual,
  GoalWizard_start,
  GoalWizard_visualError,
  IGoalWizard,
  IGoalWizardSave,
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
    const latest = GoalWizard_latestLengths(
      {
        weight: {},
        percentage: {},
        length: {
          waist: [
            { vtype: "stat", value: { value: 90, unit: "cm" }, timestamp: 1 },
            { vtype: "stat", value: { value: 86, unit: "cm" }, timestamp: 2 },
          ],
        },
      },
      5000
    );
    expect(latest).to.deep.equal({ waist: { value: 86, unit: "cm" } });
  });

  it("skips a measurement dated after today", () => {
    const latest = GoalWizard_latestLengths(
      {
        weight: {},
        percentage: {},
        length: {
          neck: [
            { vtype: "stat", value: { value: 38, unit: "cm" }, timestamp: new Date(2026, 9, 20, 9).getTime() },
            { vtype: "stat", value: { value: 50, unit: "cm" }, timestamp: new Date(2026, 9, 23, 9).getTime() },
          ],
        },
      },
      new Date(2026, 9, 21, 18).getTime()
    );
    expect(latest).to.deep.equal({ neck: { value: 38, unit: "cm" } });
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

  it("keeps a teen's previewed and saved targets at maintenance on a fat loss goal", () => {
    const teen = { ...fullProfile, birthYear: 2010 };
    const w = { ...throughToResult(start(teen)), pace: "fast" as const, updateTargets: true };
    const preview = GoalWizard_preview(w, ctx({ profile: teen }));
    expect(preview.targets?.isDeficitBlocked).to.equal(true);
    expect(preview.targets?.target).to.equal(preview.targets?.maintenance);
    expect(GoalWizard_finish(w, ctx({ profile: teen }))?.food?.goals).to.deep.equal(preview.targets?.goals);
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
      sex: "male",
      startWeight: { value: 80, unit: "kg" },
    });
    expect(save?.food?.profile.goal).to.equal("lose");
    expect(save?.food?.profile.activity).to.equal("active");
    expect(save?.bodyFatPct).to.equal(30);
  });

  it("keeps the recommended pace after saving without a food profile", () => {
    const bare: IFoodProfile = { activity: "moderate", goal: "maintain" };
    let w = GoalWizard_pickActivity(GoalWizard_pickGoal(GoalWizard_next(start(bare)), "loseFat"), "5to10k");
    w = GoalWizard_setVisual(GoalWizard_setSex(GoalWizard_pickMethod(w, "visual"), "female"), 30);
    w = GoalWizard_next(w);
    expect(w.pace).to.equal("moderate");
    const save = GoalWizard_finish({ ...w, updateTargets: false }, ctx({ profile: bare }));
    expect(save?.goal.sex).to.equal("female");
    const reopened = start(bare, save?.goal, "pace");
    expect(
      GoalWizard_preview(reopened, ctx({ profile: bare, current: save?.goal })).paceOptions.find((o) => o.isRecommended)
        ?.pace
    ).to.equal("moderate");
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

  it("blocks Continue on the visual step until a sex is picked", () => {
    const bare: IFoodProfile = { activity: "moderate", goal: "maintain" };
    const w = GoalWizard_pickMethod(
      GoalWizard_pickActivity(GoalWizard_pickGoal(GoalWizard_next(start(bare)), "loseFat"), "5to10k"),
      "visual"
    );
    expect(w.step).to.equal("bodyFatVisual");
    expect(GoalWizard_canContinue(w)).to.equal(false);
    expect(GoalWizard_visualError(w)).to.be.a("string");
    expect(GoalWizard_next(w).step).to.equal("bodyFatVisual");
    const picked = GoalWizard_setSex(w, "female");
    expect(GoalWizard_canContinue(picked)).to.equal(true);
    expect(GoalWizard_visualError(picked)).to.equal(undefined);
    expect(GoalWizard_next(picked).step).to.equal("result");
  });

  describe("GoalWizard_runSave", () => {
    const save: IGoalWizardSave = {
      goal: { kind: "loseFat", activity: "5to10k", startedAt: 700 },
      food: { goals: {} as never, profile: fullProfile },
      bodyFatPct: 22,
    };

    function makeIo(calls: string[]) {
      return {
        setGoal: async () => {
          calls.push("goal");
          await new Promise((resolve) => setTimeout(resolve, 5));
        },
        setFood: async () => {
          calls.push("food");
        },
        addBodyFat: (pct: number, at: number) => {
          calls.push(`bodyfat ${pct} ${at}`);
        },
        goBack: () => {
          calls.push("back");
        },
      };
    }

    it("saves goal, food and body fat in order, then goes back once", async () => {
      const calls: string[] = [];
      expect(await GoalWizard_runSave({ busy: false }, save, makeIo(calls))).to.equal(true);
      expect(calls).to.deep.equal(["goal", "food", "bodyfat 22 700", "back"]);
    });

    it("ignores a second tap while the first save runs", async () => {
      const calls: string[] = [];
      const guard = { busy: false };
      const io = makeIo(calls);
      const results = await Promise.all([GoalWizard_runSave(guard, save, io), GoalWizard_runSave(guard, save, io)]);
      expect(results).to.deep.equal([true, false]);
      expect(calls.filter((c) => c === "goal")).to.have.length(1);
      expect(calls.filter((c) => c === "back")).to.have.length(1);
    });

    it("lets the user retry after a failed save", async () => {
      const calls: string[] = [];
      const guard = { busy: false };
      const failing = { ...makeIo(calls), setGoal: async () => Promise.reject(new Error("offline")) };
      let message = "";
      try {
        await GoalWizard_runSave(guard, save, failing);
      } catch (e) {
        message = (e as Error).message;
      }
      expect(message).to.equal("offline");
      expect(calls).to.deep.equal([]);
      expect(await GoalWizard_runSave(guard, save, makeIo(calls))).to.equal(true);
    });
  });
});
