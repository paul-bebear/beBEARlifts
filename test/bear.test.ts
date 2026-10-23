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

  it("gives 25 points per 400 kcal, proportional below it and clamped to 100", () => {
    expect(Bear_state(fed([meal(now, 200)]), now).fullness).to.equal(12.5);
    expect(Bear_state(fed([meal(now, 800)]), now).fullness).to.equal(25);
    expect(Bear_state(fed(Array.from({ length: 5 }, () => meal(now))), now).fullness).to.equal(100);
    expect(Bear_state(fed([meal(now, -400)]), now).fullness).to.equal(0);
  });

  it("fades cub feeding linearly over 36 hours", () => {
    const data = fed([meal(now)]);
    expect(Bear_state(data, now + 18 * hourMs).fullness).to.equal(12.5);
    expect(Bear_state(data, now + 36 * hourMs).fullness).to.equal(0);
    expect(Bear_state(data, now + 72 * hourMs).fullness).to.equal(0);
  });

  it("reduces the feeding window by two hours per level, down to 18 hours", () => {
    expect(
      Bear_state(fed([meal(now)], { bear: { ...BearStoreData_empty(), celebratedLevel: 2 } }), now + 17 * hourMs)
        .fullness
    ).to.equal(12.5);
    for (const level of [10, 11, 12]) {
      const data = fed([meal(now)], { bear: { ...BearStoreData_empty(), celebratedLevel: level } });
      expect(Bear_state(data, now + 9 * hourMs).fullness).to.equal(12.5);
    }
  });

  it("shortens the feeding window by 25 percent after a counted workout", () => {
    const data = fed([meal(now)], { history: [workout(now)] });
    expect(Bear_state(data, now + 13.5 * hourMs).fullness).to.equal(12.5);
    expect(Bear_state(data, now + 24 * hourMs).fullness).to.be.closeTo(25 * (1 - 32 / 36), 0.00001);
    expect(Bear_state(data, now + 28 * hourMs).fullness).to.equal(0);
  });

  it("does not refill food when acceleration ends and counts only overlapping hours", () => {
    const data = fed([meal(now - 6 * hourMs)], { history: [workout(now)] });
    const atEnd = Bear_state(data, now + 24 * hourMs).fullness;
    expect(Bear_state(data, now + 24 * hourMs + 1).fullness).to.be.at.most(atEnd);
    const partial = fed([meal(now + 20 * hourMs)], { history: [workout(now)] });
    expect(Bear_state(partial, now + 26 * hourMs).fullness).to.be.closeTo(25 * (1 - (4 / 0.75 + 2) / 36), 0.00001);
  });

  it("merges overlapping hunger windows from workouts on adjacent days", () => {
    const data = fed([meal(now)], { history: [workout(now), workout(now + 23 * hourMs)] });
    const result = Bear_state(data, now + 24 * hourMs);
    expect(result.fullness).to.be.closeTo(25 * (1 - 32 / 36), 0.00001);
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
    expect(Bear_state(fed([meal(now, 319)], { history }), now).mood).to.equal("hungry");
    expect(Bear_state(fed([meal(now, 320)], { history }), now).mood).to.equal("normal");
    expect(Bear_state(fed([meal(now), meal(now)], { history }), now).mood).to.equal("normal");
  });

  it("ignores future meals and workouts", () => {
    const state = Bear_state(fed([meal(now + 1)], { history: [workout(now + hourMs)] }), now);
    expect([state.countedKg, state.fullness, state.lastCountedWorkoutAt]).to.deep.equal([0, 0, undefined]);
  });

  it("retains a celebrated level and the female line after history is removed", () => {
    const state = Bear_state(
      sources({ bear: { ...BearStoreData_empty(), line: "female", celebratedLevel: 7, seenBadges: [], spent: 0 } }),
      now
    );
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
      const history = [0, 24, 48].map((hours) => workout(now - hours * hourMs, 100));
      const female = { ...FoodLog_empty(), profile: { ...FoodLog_empty().profile, sex: "female" as const } };
      const men = Bear_state(sources({ history }), now);
      const women = Bear_state(sources({ history, foodLog: female }), now);
      expect([men.countedKg, men.level.tier.name]).to.deep.equal([3000, "Cub"]);
      expect([women.countedKg, women.level.tier.name]).to.deep.equal([3000, "Teen"]);
    });

    it("keeps a level already celebrated when the new numbers put the total lower", () => {
      const bear = { ...BearStoreData_empty(), celebratedLevel: 3 };
      const state = Bear_state(sources({ history: eighteenThousandKg, bear }), now);
      expect([state.countedKg, state.level.tier.name, state.level.isTierUp]).to.deep.equal([18000, "Amateur", false]);
      expect(Bear_state(sources({ history: eighteenThousandKg }), now).level.tier.name).to.equal("Teen");
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
      const data = { ...BearStoreData_empty(), line, celebratedLevel: 12, seenBadges: ["first", "week"], spent: 0 };
      expect(BearStoreData_parse(data)).to.deep.equal(data);
      expect(BearStoreData_parse(data).seenBadges).not.to.equal(data.seenBadges);
    }
  });

  it("keeps the seeded flag and allows a missing line", () => {
    const data = { ...BearStoreData_empty(), celebratedLevel: 4, seenBadges: [], spent: 0, seeded: true };
    expect(BearStoreData_parse(data)).to.deep.equal(data);
    expect(BearStoreData_parse({ ...data, seeded: "yes" })).to.deep.equal({
      ...BearStoreData_empty(),
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
});
