import "mocha";
import { expect } from "chai";
import {
  IProgramGoal,
  ProgramGoal_body,
  ProgramGoal_dailyCalorieOffset,
  ProgramGoal_empty,
  ProgramGoal_foodTargets,
  ProgramGoal_paceDetail,
  ProgramGoal_parse,
  ProgramGoal_recommend,
  ProgramGoal_set,
  ProgramGoal_toFoodProfile,
  ProgramGoal_weeklyChangeKg,
} from "../src/models/programGoal";
import { FoodTargets_compute } from "../src/models/foodTargets";

const goal = (patch: Partial<IProgramGoal> = {}): IProgramGoal => ({
  kind: "loseFat",
  pace: "moderate",
  activity: "5to10k",
  startedAt: 1000,
  ...patch,
});

describe("ProgramGoal", () => {
  it("parses a stored log and drops broken goals", () => {
    const log = ProgramGoal_parse({
      current: {
        kind: "buildMuscle",
        pace: "warp",
        activity: "nope",
        startedAt: 5,
        startWeight: { value: 80, unit: "kg" },
      },
      past: [{ kind: "maintain", startedAt: 1, pace: "fast" }, { kind: "bulk", startedAt: 2 }, null],
    });
    expect(log.current).to.deep.equal({
      kind: "buildMuscle",
      pace: "moderate",
      activity: "5to10k",
      startedAt: 5,
      startWeight: { value: 80, unit: "kg" },
    });
    expect(log.past).to.deep.equal([{ kind: "maintain", activity: "5to10k", startedAt: 1 }]);
    expect(ProgramGoal_parse(undefined)).to.deep.equal(ProgramGoal_empty());
  });

  it("moves the old goal to the past when a new one is set", () => {
    const first = ProgramGoal_set(ProgramGoal_empty(), goal({ startedAt: 1 }));
    const second = ProgramGoal_set(first, goal({ kind: "maintain", pace: undefined, startedAt: 2 }));
    expect(second.current?.startedAt).to.equal(2);
    expect(second.past.map((g) => g.startedAt)).to.deep.equal([1]);
  });

  it("turns a pace into a weekly change and a daily calorie offset", () => {
    expect(ProgramGoal_weeklyChangeKg("loseFat", "moderate", 80)).to.equal(-0.4);
    expect(ProgramGoal_dailyCalorieOffset("loseFat", "moderate", 80)).to.equal(-440);
    expect(ProgramGoal_dailyCalorieOffset("buildMuscle", "moderate", 80)).to.equal(220);
    expect(ProgramGoal_dailyCalorieOffset("maintain", undefined, 80)).to.equal(0);
    expect(ProgramGoal_paceDetail("loseFat", "fast", { value: 200, unit: "lb" })).to.equal("Lose about 2 lb a week");
  });

  it("recommends a pace from body fat", () => {
    expect(ProgramGoal_recommend("loseFat", 30, "male").pace).to.equal("fast");
    expect(ProgramGoal_recommend("loseFat", 12, "male").pace).to.equal("slow");
    expect(ProgramGoal_recommend("loseFat", 28, "female").pace).to.equal("moderate");
    expect(ProgramGoal_recommend("loseFat", undefined, undefined).pace).to.equal("moderate");
    expect(ProgramGoal_recommend("buildMuscle", 12, "male").pace).to.equal("moderate");
    const high = ProgramGoal_recommend("buildMuscle", 35, "female");
    expect(high.pace).to.equal("slow");
    expect(high.note).to.contain("35%");
    expect(ProgramGoal_recommend("maintain", 20, "male")).to.deep.equal({});
  });

  it("needs weight, height, sex and birth year for a body", () => {
    const profile = { activity: "moderate" as const, goal: "maintain" as const, heightCm: 180, sex: "male" as const };
    expect(ProgramGoal_body(profile, { value: 80, unit: "kg" }, 2026)).to.equal(undefined);
    expect(ProgramGoal_body({ ...profile, birthYear: 1996 }, { value: 176.37, unit: "lb" }, 2026)?.age).to.equal(30);
  });

  it("matches the food calculator at maintenance and moves calories by the pace", () => {
    const body = { weightKg: 80, heightCm: 180, sex: "male" as const, age: 30 };
    const maintain = ProgramGoal_foodTargets({ kind: "maintain", activity: "5to10k" }, body);
    expect(maintain).to.deep.equal(FoodTargets_compute(body, "moderate", "maintain"));
    const cut = ProgramGoal_foodTargets({ kind: "loseFat", pace: "moderate", activity: "5to10k" }, body);
    expect(maintain.goals.calories.min - cut.goals.calories.min).to.equal(440);
  });

  it("writes the goal and activity into the food profile", () => {
    const profile = ProgramGoal_toFoodProfile(
      { activity: "sedentary", goal: "maintain", heightCm: 170 },
      { kind: "buildMuscle", activity: "over15k" }
    );
    expect(profile).to.deep.equal({ activity: "veryActive", goal: "gain", heightCm: 170 });
  });
});
