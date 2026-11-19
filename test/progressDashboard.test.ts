import "mocha";
import { expect } from "chai";
import {
  IProgressDashboard,
  ProgressDashboard_build,
  ProgressDashboard_workoutsLine,
} from "../src/models/progressDashboard";
import { Settings_build } from "../src/models/settings";
import { FoodLog_empty, IFoodLog } from "../src/models/foodLog";
import { Weight_build } from "../src/models/weight";
import { IHistoryRecord } from "../src/types";

function inTimeZone(zone: string, body: () => void): void {
  const previous = process.env.TZ;
  process.env.TZ = zone;
  try {
    body();
  } finally {
    if (previous == null) {
      delete process.env.TZ;
    } else {
      process.env.TZ = previous;
    }
  }
}

const now = new Date(2026, 9, 19, 20, 0).getTime();
const day = 24 * 60 * 60 * 1000;
const settings = { ...Settings_build(), units: "kg" as const };

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
  it("shows the streak only from 2 weeks", () => {
    const volume = Weight_build(12450.4, "kg");
    expect(ProgressDashboard_workoutsLine({ count: 3, volume, weekStreak: 1 })).to.equal("12,450 kg lifted");
    expect(ProgressDashboard_workoutsLine({ count: 3, volume, weekStreak: 4 })).to.equal(
      "12,450 kg lifted · 4-week streak"
    );
  });
});

describe("ProgressDashboard_build", () => {
  it("counts food days in the last 7 days", () => {
    const log = foodOn(["2026-10-19", "2026-10-17", "2026-10-12"], 3500);
    const { nutrition } = ProgressDashboard_build({ history: [], foodLog: log, settings, now });
    expect(nutrition).to.deep.equal({ daysLogged: 2 });
  });

  it("counts workouts and volume in the last 7 days and the week streak", () => {
    const history = [record(1, 10, 60), record(3, 5, 100), record(9, 5, 100), record(22, 5, 100)];
    const { workouts } = ProgressDashboard_build({ history, foodLog: FoodLog_empty(), settings, now });
    expect(workouts.count).to.equal(2);
    expect(workouts.volume).to.deep.equal(Weight_build(1100, "kg"));
    expect(workouts.weekStreak).to.equal(2);
  });

  it("keeps a 00:30 workout on the first day of the window across the 25-hour day", () => {
    inTimeZone("America/New_York", () => {
      const firstDay = new Date(2026, 10, 1, 0, 30).getTime();
      const history = [{ ...record(0, 5, 100), startTime: firstDay }];
      const build = (at: number): IProgressDashboard["workouts"] =>
        ProgressDashboard_build({ history, foodLog: FoodLog_empty(), settings, now: at }).workouts;
      for (const hour of [23, 0]) {
        const inWindow = build(new Date(2026, 10, 7, hour, 30).getTime());
        expect(inWindow.count).to.equal(1);
        expect(inWindow.weekStreak).to.equal(1);
      }
      expect(build(new Date(2026, 10, 8, 0, 30).getTime()).count).to.equal(0);
    });
  });
});
