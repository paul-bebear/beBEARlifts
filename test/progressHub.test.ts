import "mocha";
import { expect } from "chai";
import {
  IProgressHubInput,
  ProgressHub_build,
  ProgressHub_goal,
  ProgressHub_plannedPerWeek,
} from "../src/models/progressHub";
import { Settings_build } from "../src/models/settings";
import { FoodLog_empty, IFoodEntry } from "../src/models/foodLog";
import { ProgramGoal_empty } from "../src/models/programGoal";
import { Steps_empty, Steps_setManual } from "../src/models/steps";
import { ProgressPhotos_add, ProgressPhotos_empty } from "../src/models/progressPhotos";
import { IHistoryRecord } from "../src/types";

const now = new Date(2026, 9, 21, 18, 0).getTime();
const day = 24 * 60 * 60 * 1000;
const settings = { ...Settings_build(), units: "kg" as const };

function food(dayKey: string, calories: number): IFoodEntry {
  return {
    id: `${dayKey}-${calories}`,
    day: dayKey,
    meal: "lunch",
    name: "Rice",
    source: "manual",
    nutrients: { calories, protein: 0, carbs: 0, fat: 0 },
    createdAt: now,
  };
}

function input(patch: Partial<IProgressHubInput> = {}): IProgressHubInput {
  return {
    goalLog: ProgramGoal_empty(),
    history: [],
    stats: { weight: {}, length: {}, percentage: {} },
    foodLog: FoodLog_empty(),
    steps: Steps_empty(),
    photos: ProgressPhotos_empty(),
    plannedPerWeek: 3,
    settings,
    now,
    ...patch,
  };
}

const workouts = (daysAgo: number[]): IHistoryRecord[] =>
  daysAgo.map((d) => ({ startTime: now - d * day }) as IHistoryRecord);

describe("ProgressHub", () => {
  it("averages the program's days per week, with 3 as the fallback", () => {
    expect(ProgressHub_plannedPerWeek(undefined)).to.equal(3);
    expect(ProgressHub_plannedPerWeek([{ days: [1, 2, 3, 4] }, { days: [1, 2, 3] }, { days: [] }])).to.equal(4);
  });

  it("describes no goal before one is set, for My bear's goal card", () => {
    expect(ProgressHub_goal(ProgramGoal_empty(), settings, now)).to.equal(undefined);
  });

  it("describes the current goal", () => {
    const hub = ProgressHub_build(
      input({
        goalLog: {
          version: 1,
          past: [],
          current: {
            kind: "loseFat",
            pace: "moderate",
            activity: "5to10k",
            startedAt: new Date(2026, 9, 7).getTime(),
            startWeight: { value: 200, unit: "lb" },
          },
        },
      })
    );
    expect(hub.goal).to.deep.equal({
      title: "Lose fat",
      pace: "Moderate",
      started: "Oct 7",
      startWeight: "90.7 kg",
      canChangePace: true,
    });
  });

  it("shows the latest weight and the change since the goal started", () => {
    const hub = ProgressHub_build(
      input({
        stats: {
          weight: {
            weight: [
              { vtype: "stat", value: { value: 88, unit: "kg" }, timestamp: now - 2 * day },
              { vtype: "stat", value: { value: 91, unit: "kg" }, timestamp: now - 10 * day },
            ],
          },
          length: {},
          percentage: {},
        },
        goalLog: {
          version: 1,
          past: [],
          current: {
            kind: "loseFat",
            pace: "fast",
            activity: "5to10k",
            startedAt: now - 10 * day,
            startWeight: { value: 91, unit: "kg" },
          },
        },
      })
    );
    expect(hub.weight).to.deep.equal({
      value: "88 kg",
      subtitle: "Logged 2 days ago",
      change: "-3 kg since the goal started",
    });
  });

  it("counts food days since the goal started", () => {
    const foodLog = {
      ...FoodLog_empty(),
      entries: [food("2026-10-21", 600), food("2026-10-20", 1000), food("2026-10-20", 500), food("2026-10-10", 900)],
    };
    const hub = ProgressHub_build(
      input({
        foodLog,
        goalLog: { version: 1, past: [], current: { kind: "maintain", activity: "5to10k", startedAt: now - 4 * day } },
      })
    );
    expect(hub.nutrition).to.deep.equal({
      daysLogged: 2,
      daysTracked: 5,
      since: "since the goal started",
    });
  });

  it("measures consistency against the planned workouts", () => {
    const hub = ProgressHub_build(input({ history: workouts([0, 2, 4, 9, 11, 30]) }));
    expect(hub.consistency).to.deep.equal({ percent: 42, done: 5, planned: 12, windowDays: 28 });
    const fresh = ProgressHub_build(
      input({
        history: workouts([0, 1, 2, 3]),
        goalLog: { version: 1, past: [], current: { kind: "maintain", activity: "5to10k", startedAt: now - day } },
      })
    );
    expect(fresh.consistency).to.deep.equal({ percent: 100, done: 4, planned: 3, windowDays: 7 });
  });

  it("fills the steps bar and summarises photos", () => {
    const steps = Steps_setManual(Steps_empty(), "2026-10-21", 4000);
    const photos = ProgressPhotos_add(ProgressPhotos_empty(), "data:image/jpeg;base64,AAAA", now);
    const hub = ProgressHub_build(input({ steps, photos }));
    expect(hub.steps).to.deep.equal({ today: 4000, goal: 10000, fraction: 0.4 });
    expect(hub.photos).to.deep.equal({ count: 1, subtitle: "1 photo · latest Oct 21" });
    expect(ProgressHub_build(input()).photos.subtitle).to.equal("Add your first photo");
  });
});
