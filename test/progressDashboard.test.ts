import "mocha";
import { expect } from "chai";
import {
  ProgressDashboard_build,
  ProgressDashboard_caloriesPill,
  ProgressDashboard_loggedAgo,
  ProgressDashboard_workoutsLine,
} from "../src/models/progressDashboard";
import { Settings_build } from "../src/models/settings";
import { FoodLog_empty, IFoodLog } from "../src/models/foodLog";
import { Weight_build } from "../src/models/weight";
import { IHistoryRecord, IStats } from "../src/types";

const now = new Date(2026, 9, 19, 20, 0).getTime();
const day = 24 * 60 * 60 * 1000;
const settings = { ...Settings_build(), units: "kg" as const };
const noStats: IStats = { weight: {}, length: {}, percentage: {} };

function record(daysAgo: number, reps: number, kg: number): IHistoryRecord {
  return {
    vtype: "history_record",
    date: new Date(now - daysAgo * day).toISOString(),
    programId: "adhoc",
    programName: "Ad-Hoc",
    day: 1,
    dayName: "Ad-Hoc",
    startTime: now - daysAgo * day,
    id: now - daysAgo * day,
    entries: [
      {
        vtype: "history_entry",
        id: `e${daysAgo}`,
        index: 0,
        exercise: { id: "benchPress", equipment: "barbell" },
        warmupSets: [],
        sets: [
          {
            vtype: "set",
            id: `s${daysAgo}`,
            index: 0,
            completedReps: reps,
            completedWeight: Weight_build(kg, "kg"),
            isCompleted: true,
          },
        ],
      },
    ],
  } as IHistoryRecord;
}

function foodOn(days: string[], calories: number): IFoodLog {
  const log = FoodLog_empty();
  return {
    ...log,
    goals: { ...log.goals, calories: { min: 2800, max: 3000 } },
    entries: days.map((d, i) => ({
      id: `${i}`,
      day: d,
      meal: "lunch" as const,
      name: "Food",
      source: "manual" as const,
      nutrients: { calories, protein: 0, carbs: 0, fat: 0 },
      createdAt: 0,
    })),
  };
}

describe("ProgressDashboard text", () => {
  it("says when the weight was logged", () => {
    expect([0, 1, 5].map(ProgressDashboard_loggedAgo)).to.deep.equal([
      "Logged today",
      "Logged yesterday",
      "Logged 5 days ago",
    ]);
  });

  it("labels today's calories against the target", () => {
    expect(ProgressDashboard_caloriesPill({ kind: "none" })).to.equal(undefined);
    expect(ProgressDashboard_caloriesPill({ kind: "below", calories: 640 })).to.deep.equal({
      text: "640 Cal left",
      tone: "neutral",
    });
    expect(ProgressDashboard_caloriesPill({ kind: "over", calories: 109 })?.text).to.equal("109 Cal over");
  });

  it("shows the streak only from 2 weeks", () => {
    const volume = Weight_build(12450.4, "kg");
    expect(ProgressDashboard_workoutsLine({ count: 3, volume, weekStreak: 1 })).to.equal("12,450 kg lifted");
    expect(ProgressDashboard_workoutsLine({ count: 3, volume, weekStreak: 4 })).to.equal(
      "12,450 kg lifted · 4-week streak"
    );
  });
});

describe("ProgressDashboard_build", () => {
  it("shows the latest body weight in the user's unit and how long ago it was logged", () => {
    const stats: IStats = {
      ...noStats,
      weight: {
        weight: [
          { vtype: "stat", value: Weight_build(170, "lb"), timestamp: now - 9 * day },
          { vtype: "stat", value: Weight_build(165, "lb"), timestamp: now - 2 * day },
        ],
      },
    };
    const dashboard = ProgressDashboard_build({ history: [], stats, foodLog: FoodLog_empty(), settings, now });
    expect(dashboard.weight?.daysAgo).to.equal(2);
    expect(dashboard.weight?.value.unit).to.equal("kg");
    expect(Math.round(dashboard.weight!.value.value)).to.equal(75);
  });

  it("has no weight when none was logged", () => {
    expect(
      ProgressDashboard_build({ history: [], stats: noStats, foodLog: FoodLog_empty(), settings, now }).weight
    ).to.equal(undefined);
  });

  it("counts food days in the last 7 days and compares today with the calorie target", () => {
    const log = foodOn(["2026-10-19", "2026-10-17", "2026-10-12"], 3500);
    const { nutrition } = ProgressDashboard_build({ history: [], stats: noStats, foodLog: log, settings, now });
    expect(nutrition.daysLogged).to.equal(2);
    expect(nutrition.today).to.deep.equal({ kind: "over", calories: 500 });
  });

  it("says how many calories are left when today is under the target", () => {
    const log = foodOn(["2026-10-19"], 2000);
    expect(
      ProgressDashboard_build({ history: [], stats: noStats, foodLog: log, settings, now }).nutrition.today
    ).to.deep.equal({ kind: "below", calories: 800 });
  });

  it("reports no calorie status when the user has set no goals", () => {
    const log = { ...foodOn(["2026-10-19"], 2000), goals: FoodLog_empty().goals };
    expect(
      ProgressDashboard_build({ history: [], stats: noStats, foodLog: log, settings, now }).nutrition.today
    ).to.deep.equal({ kind: "none" });
  });

  it("reports no calorie status when only other goals are set", () => {
    const empty = FoodLog_empty();
    const log = { ...foodOn(["2026-10-19"], 2000), goals: { ...empty.goals, protein: { min: 120, max: 160 } } };
    expect(
      ProgressDashboard_build({ history: [], stats: noStats, foodLog: log, settings, now }).nutrition.today
    ).to.deep.equal({ kind: "none" });
  });

  it("counts workouts and volume in the last 7 days and the week streak", () => {
    const history = [record(1, 10, 60), record(3, 5, 100), record(9, 5, 100), record(22, 5, 100)];
    const { workouts } = ProgressDashboard_build({ history, stats: noStats, foodLog: FoodLog_empty(), settings, now });
    expect(workouts.count).to.equal(2);
    expect(workouts.volume).to.deep.equal(Weight_build(1100, "kg"));
    expect(workouts.weekStreak).to.equal(2);
  });
});
