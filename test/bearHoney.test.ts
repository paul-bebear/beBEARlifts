import "mocha";
import { expect } from "chai";
import {
  BearHoney_balance,
  BearHoney_day,
  BearHoney_earned,
  BearHoney_forWorkout,
  BearHoney_sharedAt,
  IHoneySources,
} from "../src/models/bearHoney";
import { IBearCountedWorkout } from "../src/models/bearGrowth";
import { Feed_empty } from "../src/models/feed";
import { FoodLog_dayKey, FoodLog_empty, IFoodEntry, IFoodGoals } from "../src/models/foodLog";
import { BearStoreData_empty, BearStoreData_parse } from "../src/models/bearStoreData";
import { IHistoryRecord, IStats } from "../src/types";
import { Weight_build } from "../src/models/weight";

const hour = 3600000;

function at(date: number, h = 12): number {
  return new Date(2026, 9, date, h).getTime();
}

function dayKey(date: number): string {
  return FoodLog_dayKey(new Date(at(date)));
}

function record(id: number, date: number): IHistoryRecord {
  const end = at(date);
  return {
    vtype: "history_record",
    id,
    date: new Date(end).toISOString(),
    startTime: end - hour,
    endTime: end,
    programId: "p",
    programName: "P",
    day: 1,
    dayName: "Day",
    entries: [],
  };
}

function counted(id: number, date: number): IBearCountedWorkout {
  return { record: record(id, date), countedKg: 1000 };
}

function stats(...dates: number[]): IStats {
  return {
    weight: {
      weight: dates.map((date) => ({ vtype: "stat" as const, value: Weight_build(70, "kg"), timestamp: at(date, 8) })),
    },
    length: {},
    percentage: {},
  };
}

const goals: IFoodGoals = {
  calories: { min: 2000, max: 2600 },
  protein: { min: 100, max: 150 },
  carbs: { min: 200, max: 300 },
  fat: { min: 50, max: 80 },
};

function food(date: number, protein: number, carbs: number, fat: number, id = `f${date}`): IFoodEntry {
  return {
    id,
    day: dayKey(date),
    meal: "lunch",
    name: "Meal",
    source: "manual",
    nutrients: { calories: protein * 4 + carbs * 4 + fat * 9, protein, carbs, fat },
    createdAt: at(date),
  };
}

function sources(
  overrides: Partial<IHoneySources> & { entries?: IFoodEntry[]; goals?: IFoodGoals } = {}
): IHoneySources {
  const { entries, goals: foodGoals, ...rest } = overrides;
  const foodLog = { ...FoodLog_empty(), entries: entries ?? [], ...(foodGoals != null ? { goals: foodGoals } : {}) };
  return { workouts: [], stats: stats(), foodLog, sharedAt: [], ...rest };
}

const now = at(22, 20);

function dayOf(s: IHoneySources, date: number) {
  return BearHoney_day(BearHoney_earned(s, now), dayKey(date));
}

describe("BearHoney", () => {
  it("earns nothing without history", () => {
    expect(BearHoney_earned(sources(), now)).to.deep.equal({ total: 0, days: [] });
  });

  it("gives 5 honey for a counted workout", () => {
    const earned = BearHoney_earned(sources({ workouts: [counted(1, 20)] }), now);
    expect(earned.total).to.equal(5);
    expect(earned.days[0].items).to.deep.equal([{ reason: "workout", label: "Workout", amount: 5 }]);
  });

  it("gives 1 honey for weighing in, once a day", () => {
    const s = sources({ stats: stats(20, 20, 21) });
    expect(dayOf(s, 20)?.total).to.equal(1);
    expect(BearHoney_earned(s, now).total).to.equal(2);
  });

  it("gives 1 honey for each macro inside its range", () => {
    const s = sources({ entries: [food(20, 120, 250, 60)], goals });
    expect(dayOf(s, 20)?.items.map((item) => item.reason)).to.deep.equal(["protein", "carbs", "fat"]);
    expect(dayOf(s, 20)?.total).to.equal(3);
  });

  it("skips a macro that is under or over its range", () => {
    const s = sources({ entries: [food(20, 90, 250, 90)], goals });
    expect(dayOf(s, 20)?.items.map((item) => item.reason)).to.deep.equal(["carbs"]);
  });

  it("counts the edges of a range as a hit", () => {
    const s = sources({ entries: [food(20, 100, 300, 50)], goals });
    expect(dayOf(s, 20)?.total).to.equal(3);
  });

  it("sums several entries of one day before comparing", () => {
    const s = sources({ entries: [food(20, 60, 100, 25, "a"), food(20, 60, 100, 25, "b")], goals });
    expect(dayOf(s, 20)?.total).to.equal(3);
  });

  it("earns no macro honey when no targets are set", () => {
    const s = sources({ entries: [food(20, 120, 250, 60)] });
    expect(dayOf(s, 20)).to.equal(undefined);
  });

  it("earns no macro honey for a target that is not set", () => {
    const partial = { ...goals, carbs: { min: 0, max: 0 }, fat: { min: 0, max: 0 } };
    const s = sources({ entries: [food(20, 120, 0, 0)], goals: partial });
    expect(dayOf(s, 20)?.items.map((item) => item.reason)).to.deep.equal(["protein"]);
  });

  it("earns nothing on a day with a target but no food", () => {
    const s = sources({ stats: stats(21), goals });
    expect(dayOf(s, 20)).to.equal(undefined);
  });

  it("gives 1 honey for each shared post", () => {
    const s = sources({ sharedAt: [at(20, 9), at(20, 19), at(21, 9)] });
    expect(dayOf(s, 20)?.items).to.deep.equal([{ reason: "shared", label: "Shared", amount: 2 }]);
    expect(BearHoney_earned(s, now).total).to.equal(3);
  });

  it("caps a day at 10 honey", () => {
    const s = sources({
      workouts: [counted(1, 20)],
      stats: stats(20),
      entries: [food(20, 120, 250, 60)],
      goals,
      sharedAt: [at(20, 9), at(20, 19)],
    });
    const day = dayOf(s, 20);
    expect(day?.isCapped).to.equal(true);
    expect(day?.total).to.equal(10);
    expect(day?.items.reduce((sum, item) => sum + item.amount, 0)).to.equal(11);
  });

  it("gives a full day of everything exactly 10 honey without a cap flag", () => {
    const s = sources({
      workouts: [counted(1, 20)],
      stats: stats(20),
      entries: [food(20, 120, 250, 60)],
      goals,
      sharedAt: [at(20, 9)],
    });
    expect(dayOf(s, 20)?.total).to.equal(10);
    expect(dayOf(s, 20)?.isCapped).to.equal(false);
  });

  describe("streak bonus", () => {
    const week = [1, 2, 3, 4, 5, 6, 7];

    it("gives 5 honey on the seventh day in a row", () => {
      const s = sources({ workouts: week.map((d) => counted(d, d)) });
      expect(dayOf(s, 6)?.total).to.equal(5);
      expect(dayOf(s, 7)?.total).to.equal(10);
      expect(dayOf(s, 7)?.items.at(-1)).to.deep.equal({ reason: "streak", label: "7-day streak", amount: 5 });
      expect(BearHoney_earned(s, now).total).to.equal(7 * 5 + 5);
    });

    it("gives nothing for six days", () => {
      const s = sources({ workouts: [1, 2, 3, 4, 5, 6].map((d) => counted(d, d)) });
      expect(BearHoney_earned(s, now).total).to.equal(30);
    });

    it("counts food-only days toward the streak", () => {
      const s = sources({ entries: week.map((d) => food(d, 10, 10, 10)), goals });
      expect(dayOf(s, 7)?.total).to.equal(5);
      expect(dayOf(s, 7)?.items.at(-1)?.reason).to.equal("streak");
    });

    it("gives the bonus on top of a full 10 honey day", () => {
      const s = sources({
        workouts: week.map((d) => counted(d, d)),
        stats: stats(7),
        entries: [food(7, 120, 250, 60)],
        goals,
        sharedAt: [at(7, 9)],
      });
      expect(dayOf(s, 7)?.total).to.equal(15);
    });

    it("gives 5 more for each full week and keeps earlier bonuses after a break", () => {
      const days = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 16, 17];
      const s = sources({ workouts: days.map((d) => counted(d, d)) });
      expect(dayOf(s, 7)?.total).to.equal(10);
      expect(dayOf(s, 14)?.total).to.equal(10);
      expect(dayOf(s, 17)?.total).to.equal(5);
      expect(BearHoney_earned(s, now).total).to.equal(16 * 5 + 10);
    });

    it("does not carry a streak across a gap", () => {
      const s = sources({ workouts: [1, 2, 3, 4, 5, 6, 8].map((d) => counted(d, d)) });
      expect(BearHoney_earned(s, now).total).to.equal(35);
    });
  });

  it("ignores days after today", () => {
    const s = sources({ workouts: [counted(1, 20), counted(2, 25)], sharedAt: [at(26)] });
    expect(BearHoney_earned(s, now).total).to.equal(5);
  });

  it("lists days oldest first and skips days with no honey", () => {
    const s = sources({ workouts: [counted(2, 21), counted(1, 19)] });
    expect(BearHoney_earned(s, now).days.map((day) => day.day)).to.deep.equal([dayKey(19), dayKey(21)]);
  });

  describe("balance", () => {
    it("is earned minus spent", () => {
      expect(BearHoney_balance(42, 12)).to.equal(30);
    });

    it("never goes below zero", () => {
      expect(BearHoney_balance(10, 25)).to.equal(0);
    });
  });

  describe("forWorkout", () => {
    it("gives 5 for a counted workout", () => {
      const s = sources({ workouts: [counted(1, 20)] });
      expect(BearHoney_forWorkout(record(1, 20), s)).to.equal(5);
    });

    it("gives 0 for a workout that did not count", () => {
      const s = sources({ workouts: [counted(1, 20)] });
      expect(BearHoney_forWorkout(record(2, 20), s)).to.equal(0);
    });

    it("gives only what fits under the daily max", () => {
      const s = sources({
        workouts: [counted(1, 20)],
        stats: stats(20),
        entries: [food(20, 120, 250, 60)],
        goals,
        sharedAt: [at(20, 9), at(20, 19)],
      });
      expect(BearHoney_forWorkout(record(1, 20), s)).to.equal(4);
    });

    it("includes the streak bonus the workout completes", () => {
      const s = sources({ workouts: [1, 2, 3, 4, 5, 6, 7].map((d) => counted(d, d)) });
      expect(BearHoney_forWorkout(record(7, 7), s)).to.equal(10);
    });
  });

  describe("sharedAt", () => {
    it("returns the times of the cache owner's own posts and meals", () => {
      const meal = { id: "m", description: "d", macros: { kcal: 1, protein: 1, carbs: 1, fat: 1 } };
      const summary = {} as never;
      const feed = {
        ...Feed_empty(),
        userId: "me",
        posts: [
          { userId: "me", workoutId: 1, postedAt: 100, summary },
          { userId: "friend", workoutId: 2, postedAt: 200, summary },
        ],
        meals: [
          { ...meal, userId: "me", postedAt: 300 },
          { ...meal, id: "n", userId: "friend", postedAt: 400 },
        ],
      };
      expect(BearHoney_sharedAt(feed)).to.deep.equal([100, 300]);
    });

    it("returns nothing when nobody is signed in", () => {
      expect(BearHoney_sharedAt(Feed_empty())).to.deep.equal([]);
    });
  });
});

describe("BearStoreData spent", () => {
  it("starts at 0", () => {
    expect(BearStoreData_empty().spent).to.equal(0);
  });

  it("reads an old store with no spent field as 0", () => {
    const parsed = BearStoreData_parse({ line: "male", celebratedLevel: 3, seenBadges: ["a"] });
    expect(parsed).to.deep.equal({ line: "male", celebratedLevel: 3, seenBadges: ["a"], spent: 0 });
  });

  it("keeps a valid spent and resets a bad one", () => {
    const base = { celebratedLevel: 1, seenBadges: [] };
    expect(BearStoreData_parse({ ...base, spent: 40 }).spent).to.equal(40);
    expect(BearStoreData_parse({ ...base, spent: -5 }).spent).to.equal(0);
    expect(BearStoreData_parse({ ...base, spent: 1.5 }).spent).to.equal(0);
    expect(BearStoreData_parse({ ...base, spent: "9" }).spent).to.equal(0);
  });
});
