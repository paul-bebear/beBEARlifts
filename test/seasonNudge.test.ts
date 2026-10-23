import "mocha";
import { expect } from "chai";
import { FoodLog_add, FoodLog_empty, IFoodLog } from "../src/models/foodLog";
import {
  FoodTargets_compute,
  FoodTargets_fromCalories,
  FoodTargets_maintenance,
  FoodTargets_start,
  FoodTargets_toProfile,
  IFoodBody,
  IFoodProfile,
} from "../src/models/foodTargets";
import {
  ISeasonNudge,
  SeasonNudge_accept,
  SeasonNudge_entry,
  SeasonNudge_foods,
  SeasonNudge_for,
} from "../src/models/seasonNudge";
import { IWeight } from "../src/types";

const weight: IWeight = { value: 80, unit: "kg" };
const profile: IFoodProfile = {
  activity: "moderate",
  goal: "maintain",
  sex: "male",
  heightCm: 180,
  birthYear: 1996,
  seasons: true,
  lastSeason: "bulk",
};
const goals = {
  calories: { min: 3000, max: 3200 },
  protein: { min: 130, max: 175 },
  carbs: { min: 400, max: 450 },
  fat: { min: 50, max: 80 },
};

function logWith(patch: Partial<IFoodProfile>, eaten: number[] = [], day = new Date(2026, 9, 23, 9)): IFoodLog {
  const log: IFoodLog = { ...FoodLog_empty(), goals, profile: { ...profile, ...patch } };
  return eaten.reduce(
    (l, calories, i) =>
      FoodLog_add(
        l,
        SeasonNudge_entry(
          { ...SeasonNudge_foods[0], nutrients: { ...SeasonNudge_foods[0].nutrients, calories } },
          day,
          `${i}`
        )
      ),
    log
  );
}

function change(nudge: ISeasonNudge | undefined): Extract<ISeasonNudge, { kind: "change" }> {
  expect(nudge?.kind).to.equal("change");
  return nudge as Extract<ISeasonNudge, { kind: "change" }>;
}

describe("SeasonNudge season change", () => {
  const april = new Date(2027, 3, 1, 9);

  it("shows nothing when seasons is off", () => {
    expect(SeasonNudge_for({ foodLog: logWith({ seasons: false }), latestWeight: weight, now: april })).to.equal(
      undefined
    );
  });

  it("names the old and new season and the new target on the first open in a new season", () => {
    const nudge = change(SeasonNudge_for({ foodLog: logWith({}), latestWeight: weight, now: april }));
    expect(nudge.text).to.equal("Bulk season is over. Lean season until June 30. New target: 2,200 kcal.");
    expect(nudge.season).to.equal("lean");
    expect(nudge.goals?.calories).to.deep.equal({ min: 2100, max: 2300 });
  });

  it("writes the season and the new targets on OK, and then shows nothing", () => {
    const nudge = change(SeasonNudge_for({ foodLog: logWith({}), latestWeight: weight, now: april }));
    const log = SeasonNudge_accept(logWith({}), nudge.season, nudge.goals);
    expect(log.profile.lastSeason).to.equal("lean");
    expect(log.goals).to.deep.equal(nudge.goals);
    expect(SeasonNudge_for({ foodLog: log, latestWeight: weight, now: april })).to.equal(undefined);
  });

  it("keeps a teen at maintenance in lean season", () => {
    const nudge = change(SeasonNudge_for({ foodLog: logWith({ birthYear: 2010 }), latestWeight: weight, now: april }));
    expect(nudge.text).to.contain("Under 18 or with a BMI under 20, it stays at maintenance.");
  });

  it("treats a user who entered age 17 in October as under 18 a year later", () => {
    const enteredAt17 = FoodTargets_toProfile(
      { ...FoodTargets_start(profile, weight, "kg", 2026).form, age: "17" },
      new Date(2026, 9, 23, 12)
    );
    expect(enteredAt17.birthYear).to.equal(2009);
    const body: IFoodBody = { weightKg: 80, heightCm: 180, sex: "male", age: 18 };
    const maintenance = FoodTargets_compute(body, "moderate", "maintain");

    const lean = change(SeasonNudge_for({ foodLog: logWith({ birthYear: 2009 }), latestWeight: weight, now: april }));
    expect(lean.text).to.contain("Under 18 or with a BMI under 20, it stays at maintenance.");
    expect(lean.goals).to.deep.equal(maintenance.goals);

    const october = new Date(2027, 9, 1, 9);
    const bulk = change(
      SeasonNudge_for({
        foodLog: logWith({ birthYear: 2009, lastSeason: "summer" }),
        latestWeight: weight,
        now: october,
      })
    );
    const m = FoodTargets_maintenance(body, "moderate");
    expect(bulk.goals).to.deep.equal(FoodTargets_fromCalories(body, m, m * 1.1).goals);
  });

  it("keeps the old targets when the profile has no body to compute from", () => {
    const nudge = change(
      SeasonNudge_for({ foodLog: logWith({ heightCm: undefined }), latestWeight: weight, now: april })
    );
    expect(nudge.text).to.equal(
      "Bulk season is over. Lean season until June 30. Open food targets to get your new numbers."
    );
    const log = SeasonNudge_accept(logWith({ heightCm: undefined }), nudge.season, nudge.goals);
    expect(log.goals).to.deep.equal(goals);
    expect(log.profile.lastSeason).to.equal("lean");
  });

  it("uses the southern season south of the equator", () => {
    const october = new Date(2026, 9, 1, 9);
    expect(SeasonNudge_for({ foodLog: logWith({ south: true, lastSeason: "lean" }), now: october })).to.equal(
      undefined
    );
    const nudge = change(SeasonNudge_for({ foodLog: logWith({ south: true }), now: october }));
    expect(nudge.text).to.contain("Lean season until December 31.");
  });
});

describe("SeasonNudge hungry bear", () => {
  const evening = new Date(2026, 9, 23, 18, 30);

  it("shows the kcal left and the closest foods first from 18:00 in bulk", () => {
    const nudge = SeasonNudge_for({ foodLog: logWith({}, [1200, 800]), now: evening });
    expect(nudge?.kind).to.equal("hungry");
    expect(nudge?.text).to.equal("Your bear is still hungry. 1,000 kcal left.");
    expect(nudge?.kind === "hungry" && nudge.foods.map((f) => f.key)).to.deep.equal(["shake", "nuts", "sandwich"]);
    const smallLog = { ...logWith({}, [700]), goals: { ...goals, calories: { min: 1200, max: 1400 } } };
    const small = SeasonNudge_for({ foodLog: smallLog, now: evening });
    expect(small?.text).to.equal("Your bear is still hungry. 500 kcal left.");
    expect(small?.kind === "hungry" && small.foods.map((f) => f.key)).to.deep.equal(["nuts", "sandwich", "shake"]);
  });

  it("stays away at 70% of the target, before 18:00, outside bulk, and with no target", () => {
    expect(SeasonNudge_for({ foodLog: logWith({}, [2100]), now: evening })).to.equal(undefined);
    expect(SeasonNudge_for({ foodLog: logWith({}, [500]), now: new Date(2026, 9, 23, 17, 59) })).to.equal(undefined);
    const june = new Date(2027, 5, 10, 19);
    expect(SeasonNudge_for({ foodLog: logWith({ lastSeason: "lean" }, [], june), now: june })).to.equal(undefined);
    const noGoals = { ...logWith({}), goals: FoodLog_empty().goals };
    expect(SeasonNudge_for({ foodLog: noGoals, now: evening })).to.equal(undefined);
  });

  it("logs a one-tap food as dinner today", () => {
    const entry = SeasonNudge_entry(SeasonNudge_foods[1], new Date(2026, 9, 23, 19), "id1");
    expect(entry).to.deep.include({
      id: "id1",
      day: "2026-10-23",
      meal: "dinner",
      name: "Mixed nuts",
      source: "manual",
    });
    expect(entry.nutrients.calories).to.equal(590);
  });
});
