import "mocha";
import { expect } from "chai";
import {
  IProgramGoal,
  IStepsBand,
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
import { FoodTargets_compute, IFoodActivity, IFoodBody, IFoodProfile, IFoodSex } from "../src/models/foodTargets";

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
    const now = new Date(2026, 9, 23).getTime();
    expect(ProgramGoal_body(profile, { value: 80, unit: "kg" }, 2026, now)).to.equal(undefined);
    const legacy = ProgramGoal_body({ ...profile, birthYear: 1996 }, { value: 176.37, unit: "lb" }, 2026, now);
    expect(legacy?.age).to.equal(30);
    expect(legacy).not.to.have.property("minAge");
  });

  it("counts the age typed into the calculator plus the full years since for the under-18 rules", () => {
    const profile = { activity: "moderate" as const, goal: "maintain" as const, heightCm: 180, sex: "male" as const };
    const weight = { value: 80, unit: "kg" as const };
    const typed17 = { ...profile, birthYear: 2009, ageSetAt: new Date(2026, 9, 23).getTime() };
    expect(ProgramGoal_body(typed17, weight, 2027, new Date(2027, 9, 22).getTime())).to.include({
      age: 18,
      minAge: 17,
    });
    expect(ProgramGoal_body(typed17, weight, 2027, new Date(2027, 9, 23).getTime())).to.include({
      age: 18,
      minAge: 18,
    });
  });

  it("matches the food calculator at maintenance and moves calories by the pace", () => {
    const body = { weightKg: 80, heightCm: 180, sex: "male" as const, age: 30 };
    const maintain = ProgramGoal_foodTargets({ kind: "maintain", activity: "5to10k" }, body);
    expect(maintain).to.deep.equal(FoodTargets_compute(body, "moderate", "maintain"));
    const cut = ProgramGoal_foodTargets({ kind: "loseFat", pace: "moderate", activity: "5to10k" }, body);
    expect(maintain.goals.calories.min - cut.goals.calories.min).to.equal(440);
  });

  describe("keeps every adult number with a BMI of 20 or more", () => {
    const rows = [
      "30 male 80 180 moderate 5to10k | 2210 2760 3030 3170 2210 2760 2540 2320 1880 2980 2760",
      "19 male 70 175 light under5k | 1870 2340 2580 2690 1870 2340 2150 1960 1570 2540 2340",
      "18 female 60 165 sedentary under5k | 1330 1660 1820 1900 1330 1660 1730 1570 1240 2060 1900",
      "45 female 75 170 active 10to15k | 1970 2460 2710 2830 1970 2460 2250 2050 1640 2670 2460",
      "22 male 95 185 veryActive over15k | 3040 3800 4180 4370 3040 3800 3540 3280 2760 4060 3800",
      "25 female 52 160 light under5k | 1360 1700 1870 1950 1360 1700 1550 1410 1200 1840 1700",
      "60 male 90 172 sedentary 5to10k | 1610 2020 2220 2320 1610 2020 2360 2110 1610 2850 2600",
      "35 female 110 168 moderate 5to10k | 2250 2810 3090 3230 2250 2810 2510 2210 1600 3110 2810",
      "20 male 65 179 moderate 10to15k | 2080 2590 2850 2980 2080 2590 2710 2530 2170 3070 2890",
    ];
    const aims = ["lose", "maintain", "gain", "bulk", "lean", "summer"] as const;
    const goals = [
      ["loseFat", "slow"],
      ["loseFat", "moderate"],
      ["loseFat", "fast"],
      ["buildMuscle", "moderate"],
      ["maintain", undefined],
    ] as const;
    for (const row of rows) {
      const [who, numbers] = row.split(" | ");
      const [age, sex, weightKg, heightCm, activity, band] = who.split(" ");
      const body: IFoodBody = { age: +age, sex: sex as IFoodSex, weightKg: +weightKg, heightCm: +heightCm };
      it(who, () => {
        const calculator = aims.map((aim) => FoodTargets_compute(body, activity as IFoodActivity, aim).target);
        const wizard = goals.map(
          ([kind, pace]) => ProgramGoal_foodTargets({ kind, pace, activity: band as IStepsBand }, body).target
        );
        expect([...calculator, ...wizard]).to.deep.equal(numbers.split(" ").map(Number));
      });
    }
    const fullBody: IFoodProfile = { activity: "moderate", goal: "maintain", heightCm: 180, sex: "male" };
    const saved = [
      "legacy, year minus birth year 18 | 2008 | 2630 2410 1970 3070",
      "legacy, year minus birth year 25 | 2001 | 2580 2360 1920 3020",
      "age typed in January 2026 | 1996 | 2540 2320 1880 2980",
    ];
    for (const row of saved) {
      const [who, birthYear, numbers] = row.split(" | ");
      it(`80 kg 180 cm male profile, ${who}`, () => {
        const typed = who.startsWith("age typed") ? { ageSetAt: new Date(2026, 0, 10).getTime() } : {};
        const profile: IFoodProfile = { ...fullBody, birthYear: +birthYear, ...typed };
        const body = ProgramGoal_body(profile, { value: 80, unit: "kg" }, 2026, new Date(2026, 9, 23).getTime());
        const targets = goals
          .slice(0, 4)
          .map(([kind, pace]) => ProgramGoal_foodTargets({ kind, pace, activity: "5to10k" }, body!).target);
        expect(targets).to.deep.equal(numbers.split(" ").map(Number));
      });
    }
  });

  it("keeps a user under 18 or with a BMI under 20 at maintenance in the goal wizard", () => {
    const teen: IFoodBody = { age: 16, sex: "male", weightKg: 70, heightCm: 175 };
    const thin: IFoodBody = { age: 25, sex: "male", weightKg: 58, heightCm: 175 };
    const cases: [IFoodBody, number][] = [
      [teen, 2660],
      [thin, 2410],
    ];
    for (const [body, maintenance] of cases) {
      const cut = ProgramGoal_foodTargets({ kind: "loseFat", pace: "fast", activity: "5to10k" }, body);
      expect(cut.target).to.equal(maintenance);
      expect(cut.isDeficitBlocked).to.equal(true);
    }
  });

  it("writes the goal and activity into the food profile", () => {
    const profile = ProgramGoal_toFoodProfile(
      { activity: "sedentary", goal: "maintain", heightCm: 170 },
      { kind: "buildMuscle", activity: "over15k" }
    );
    expect(profile).to.deep.equal({ activity: "veryActive", goal: "gain", heightCm: 170 });
  });
});
