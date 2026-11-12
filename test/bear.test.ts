import "mocha";
import { expect } from "chai";
import sinon from "sinon";
import { Bear_state, IBearSources } from "../src/models/bear";
import { BearStoreData_empty, BearStoreData_parse } from "../src/models/bearStoreData";
import { FoodLog_empty, IFoodEntry } from "../src/models/foodLog";
import { Settings_build } from "../src/models/settings";
import { IHistoryRecord } from "../src/types";
import { Weight_build } from "../src/models/weight";

const hourMs = 3600000;
const now = new Date(2026, 9, 20, 12).getTime();

function workout(endTime: number, kg: number = 50): IHistoryRecord {
  return {
    vtype: "history_record",
    id: endTime,
    date: new Date(endTime).toISOString(),
    startTime: endTime - hourMs,
    endTime,
    programId: "p",
    programName: "Program",
    day: 1,
    dayName: "Day",
    entries: [
      {
        vtype: "history_entry",
        id: "e",
        index: 0,
        exercise: { id: "benchPress", equipment: "barbell" },
        warmupSets: [],
        sets: [
          {
            vtype: "set",
            id: "s",
            index: 0,
            completedWeight: Weight_build(kg, "kg"),
            completedReps: 10,
            isCompleted: true,
          },
        ],
      },
    ],
  };
}

function meal(at: number, calories: number = 400): IFoodEntry {
  return {
    id: `${at}`,
    day: "2026-10-20",
    meal: "lunch",
    name: "Lunch",
    source: "manual",
    createdAt: at,
    nutrients: { calories, protein: 0, carbs: 0, fat: 0 },
  };
}

function sources(overrides: Partial<IBearSources> = {}): IBearSources {
  return {
    history: [],
    foodLog: FoodLog_empty(),
    stats: { weight: {}, length: {}, percentage: {} },
    settings: Settings_build(),
    ...overrides,
  };
}

function fed(entries: IFoodEntry[], overrides: Partial<IBearSources> = {}): IBearSources {
  return sources({ foodLog: { ...FoodLog_empty(), entries }, ...overrides });
}

describe("Bear_state", () => {
  it("starts as an empty male cub with no counted workout", () => {
    const state = Bear_state(sources(), now);
    expect([
      state.line,
      state.level.tier.level,
      state.countedKg,
      state.fullness,
      state.energy,
      state.mood,
      state.lastCountedWorkoutAt,
    ]).to.deep.equal(["male", 1, 0, 0, 0, "tired", undefined]);
  });

  it("fills the bear by today's calories over the default 2,500 when no target is set", () => {
    expect(Bear_state(fed([meal(now, 250)]), now).fullness).to.equal(10);
    expect(Bear_state(fed([meal(now, 1250)]), now).fullness).to.equal(50);
    expect(Bear_state(fed([meal(now, 2500)]), now).fullness).to.equal(100);
    expect(Bear_state(fed([meal(now, 9000)]), now).fullness).to.equal(100);
    expect(Bear_state(fed([meal(now, -400)]), now).fullness).to.equal(0);
  });

  it("gives 30 percent for 840 of 2,800 cal whether it was one item or three", () => {
    const goals = { ...FoodLog_empty().goals, calories: { min: 0, max: 2800 } };
    const one = { ...FoodLog_empty(), goals, entries: [meal(now, 840)] };
    const three = { ...FoodLog_empty(), goals, entries: [meal(now, 280), meal(now + 1, 280), meal(now + 2, 280)] };
    expect(Bear_state(sources({ foodLog: one }), now).fullness).to.equal(30);
    expect(Bear_state(sources({ foodLog: three }), now + 3).fullness).to.equal(30);
  });

  it("does not fade through the day and starts again at midnight", () => {
    const data = fed([meal(now, 1250)]);
    expect(Bear_state(data, now + 10 * hourMs).fullness).to.equal(50);
    expect(Bear_state(data, now + 13 * hourMs).fullness).to.equal(0);
  });

  it("counts only the calories logged for today", () => {
    const yesterday = { ...meal(now, 2500), day: "2026-10-19" };
    expect(Bear_state(fed([yesterday, meal(now, 250)]), now).fullness).to.equal(10);
  });

  it("keeps energy at 100 for 56 hours on a three-day program, then fades over 168 hours", () => {
    const data = sources({ history: [workout(now)], plannedDaysPerWeek: 3 });
    expect(Bear_state(data, now + 56 * hourMs).energy).to.equal(100);
    expect(Bear_state(data, now + 140 * hourMs).energy).to.equal(50);
    expect(Bear_state(data, now + 216 * hourMs).energy).to.be.closeTo(100 / 21, 0.00001);
    expect(Bear_state(data, now + 224 * hourMs).energy).to.equal(0);
  });

  it("uses 168 hours of energy grace without a program", () => {
    const data = sources({ history: [workout(now)] });
    expect(Bear_state(data, now + 168 * hourMs).energy).to.equal(100);
    expect(Bear_state(data, now + 420 * hourMs).energy).to.equal(50);
    expect(Bear_state(data, now + 672 * hourMs).energy).to.equal(0);
    expect(Bear_state({ ...data, plannedDaysPerWeek: 0 }, now + 168 * hourMs).energy).to.equal(100);
  });

  it("resets energy after a counted workout and ignores short or second daily workouts", () => {
    const first = workout(now - 300 * hourMs);
    const latest = workout(now);
    expect(Bear_state(sources({ history: [first, latest], plannedDaysPerWeek: 3 }), now).energy).to.equal(100);
    const short = { ...latest, startTime: now - 9 * 60000 };
    expect(Bear_state(sources({ history: [first, short], plannedDaysPerWeek: 3 }), now).energy).to.equal(0);
    const sameDay = [workout(now - 3 * hourMs), latest];
    expect(Bear_state(sources({ history: sameDay }), now).lastCountedWorkoutAt).to.equal(now - 3 * hourMs);
  });

  it("uses pumped before tired and hungry through the two-hour boundary", () => {
    const data = sources({ history: [workout(now)] });
    expect(Bear_state(data, now + 2 * hourMs).mood).to.equal("pumped");
    expect(Bear_state(data, now + 2 * hourMs + 1).mood).to.equal("hungry");
  });

  it("keeps a personal-record workout pumped for 24 hours, then lets the mood fall", () => {
    const data = sources({ history: [workout(now - 48 * hourMs, 40), workout(now, 50)], plannedDaysPerWeek: 3 });
    expect(Bear_state(data, now + 24 * hourMs).mood).to.equal("pumped");
    expect(Bear_state(data, now + 24 * hourMs + 1).mood).to.equal("hungry");
    expect(Bear_state(data, now + 300 * hourMs).mood).to.equal("tired");
  });

  it("uses tired before hungry below 40 energy", () => {
    const data = fed([meal(now)], { history: [workout(now - 160 * hourMs)], plannedDaysPerWeek: 3 });
    expect(Bear_state(data, now).mood).to.equal("tired");
    expect(Bear_state({ ...data, foodLog: FoodLog_empty() }, now).mood).to.equal("tired");
  });

  it("uses hungry below 20 fullness and normal at 20, including the old ok band", () => {
    const history = [workout(now - 3 * hourMs)];
    expect(Bear_state(fed([meal(now, 499)], { history }), now).mood).to.equal("hungry");
    expect(Bear_state(fed([meal(now, 500)], { history }), now).mood).to.equal("normal");
    expect(Bear_state(fed([meal(now), meal(now)], { history }), now).mood).to.equal("normal");
  });

  it("ignores future workouts", () => {
    const state = Bear_state(sources({ history: [workout(now + hourMs)] }), now);
    expect([state.countedKg, state.lastCountedWorkoutAt]).to.deep.equal([0, undefined]);
  });

  it("retains a celebrated level and the female line after history is removed", () => {
    const state = Bear_state(sources({ bear: { line: "female", celebratedLevel: 7, seenBadges: [], spent: 0 } }), now);
    expect([state.line, state.level.tier.level, state.level.isTierUp]).to.deep.equal(["female", 7, false]);
  });

  it("takes the onboarding line until the user picks one", () => {
    expect(Bear_state(sources({ defaultLine: "female" }), now).line).to.equal("female");
    expect(
      Bear_state(sources({ defaultLine: "female", bear: { ...BearStoreData_empty(), line: "male" } }), now).line
    ).to.equal("male");
  });

  it("keeps a reached level pending until its celebration is saved", () => {
    const history = [0, 24, 48, 72, 96].map((hours) => workout(now - hours * hourMs, 100));
    const data = sources({ history });
    const state = Bear_state(data, now);
    expect([state.countedKg, state.level.tier.level, state.level.isTierUp]).to.deep.equal([5000, 2, true]);
    expect(
      Bear_state({ ...data, bear: { ...BearStoreData_empty(), celebratedLevel: 2 } }, now).level.isTierUp
    ).to.equal(false);
  });

  describe("level set", () => {
    const eighteenThousandKg = Array.from({ length: 18 }, (_, i) => workout(now - i * 24 * hourMs, 100));

    it("starts every bear on the men's set", () => {
      expect(Bear_state(sources(), now).tierSet).to.equal("male");
    });

    it("takes the food profile sex first, then the bear line, then the men's set", () => {
      const female = { ...FoodLog_empty(), profile: { ...FoodLog_empty().profile, sex: "female" as const } };
      const male = { ...FoodLog_empty(), profile: { ...FoodLog_empty().profile, sex: "male" as const } };
      const femaleBear = { ...BearStoreData_empty(), line: "female" as const };
      const maleBear = { ...BearStoreData_empty(), line: "male" as const };
      expect(Bear_state(sources({ foodLog: female }), now).tierSet).to.equal("female");
      expect(Bear_state(sources({ foodLog: male, bear: femaleBear }), now).tierSet).to.equal("male");
      expect(Bear_state(sources({ foodLog: female, bear: maleBear }), now).tierSet).to.equal("female");
      expect(Bear_state(sources({ bear: femaleBear }), now).tierSet).to.equal("female");
      expect(Bear_state(sources({ bear: maleBear }), now).tierSet).to.equal("male");
    });

    it("measures the same counted kg against the women's thresholds", () => {
      const history = [workout(now, 100)];
      const female = { ...FoodLog_empty(), profile: { ...FoodLog_empty().profile, sex: "female" as const } };
      const men = Bear_state(sources({ history }), now);
      const women = Bear_state(sources({ history, foodLog: female }), now);
      expect([men.countedKg, men.level.tier.name]).to.deep.equal([1000, "Cub"]);
      expect([women.countedKg, women.level.tier.name]).to.deep.equal([1000, "Teen"]);
    });

    it("keeps a level already celebrated when the new numbers put the total lower", () => {
      const bear = { ...BearStoreData_empty(), celebratedLevel: 4 };
      const state = Bear_state(sources({ history: eighteenThousandKg, bear }), now);
      expect([state.countedKg, state.level.tier.name, state.level.isTierUp]).to.deep.equal([18000, "Rookie", false]);
      expect(Bear_state(sources({ history: eighteenThousandKg }), now).level.tier.name).to.equal("Amateur");
    });
  });

  it("uses normal at exactly 40 energy when the bear has enough food", () => {
    const data = fed([meal(now), meal(now)], { history: [workout(now - 156.8 * hourMs)], plannedDaysPerWeek: 3 });
    expect(Bear_state(data, now).energy).to.equal(40);
    expect(Bear_state(data, now).mood).to.equal("normal");
    expect(Bear_state(data, now + 1).mood).to.equal("tired");
  });

  it("does not call a clock or mutate the sources", () => {
    const data = fed([meal(now)], { history: [workout(now)] });
    const original = JSON.stringify(data);
    const clock = sinon.stub(Date, "now").throws(new Error("clock read"));
    try {
      expect(Bear_state(data, now)).to.deep.equal(Bear_state(data, now));
      expect(clock.callCount).to.equal(0);
      expect(JSON.stringify(data)).to.equal(original);
    } finally {
      clock.restore();
    }
  });
});

describe("BearStoreData", () => {
  it("parses both lines and copies seen badge ids", () => {
    for (const line of ["male", "female"] as const) {
      const data = { line, celebratedLevel: 12, seenBadges: ["first", "week"], spent: 0 };
      expect(BearStoreData_parse(data)).to.deep.equal(data);
      expect(BearStoreData_parse(data).seenBadges).not.to.equal(data.seenBadges);
    }
  });

  it("keeps the seeded flag and allows a missing line", () => {
    const data = { celebratedLevel: 4, seenBadges: [], spent: 0, seeded: true };
    expect(BearStoreData_parse(data)).to.deep.equal(data);
    expect(BearStoreData_parse({ ...data, seeded: "yes" })).to.deep.equal({
      celebratedLevel: 4,
      seenBadges: [],
      spent: 0,
    });
  });

  it("returns a fresh empty value for unknown or broken input", () => {
    const empty = BearStoreData_empty();
    for (const raw of [
      undefined,
      null,
      1,
      "bad",
      [],
      {},
      { ...empty, line: "unknown" },
      { ...empty, celebratedLevel: -1 },
      { ...empty, celebratedLevel: 1.5 },
      { ...empty, celebratedLevel: Infinity },
      { ...empty, seenBadges: [1] },
    ]) {
      expect(BearStoreData_parse(raw)).to.deep.equal(empty);
    }
    expect(BearStoreData_empty().seenBadges).not.to.equal(BearStoreData_empty().seenBadges);
  });

  it("keeps the honey, the bear and the badges when one other field is broken", () => {
    const saved = {
      line: "female" as const,
      celebratedLevel: 6,
      seenBadges: ["first", "week"],
      spent: 40,
      seeded: true as const,
      badgesSeeded: true as const,
    };
    expect(BearStoreData_parse({ ...saved, celebratedLevel: 2.5 })).to.deep.equal({
      line: "female",
      celebratedLevel: 1,
      seenBadges: ["first", "week"],
      spent: 40,
      badgesSeeded: true,
    });
    expect(BearStoreData_parse({ ...saved, seenBadges: "first" })).to.deep.equal({
      line: "female",
      celebratedLevel: 6,
      seenBadges: [],
      spent: 40,
      seeded: true,
    });
    expect(BearStoreData_parse({ ...saved, line: "panda", spent: -3 })).to.deep.equal({
      celebratedLevel: 6,
      seenBadges: ["first", "week"],
      spent: 0,
      seeded: true,
      badgesSeeded: true,
    });
    expect(BearStoreData_parse({ ...saved, seenBadges: ["first", 2, "week"] }).seenBadges).to.deep.equal([
      "first",
      "week",
    ]);
  });
});
