import "mocha";
import { expect } from "chai";
import {
  IProgressHubInput,
  ProgressHub_build,
  ProgressHub_goal,
  ProgressHub_plannedPerWeek,
  ProgressHub_weekRanges,
} from "../src/models/progressHub";
import { Settings_build } from "../src/models/settings";
import { FoodLog_empty, IFoodEntry } from "../src/models/foodLog";
import { ProgramGoal_empty } from "../src/models/programGoal";
import { Steps_empty, Steps_setManual } from "../src/models/steps";
import { ProgressPhotos_add, ProgressPhotos_empty } from "../src/models/progressPhotos";
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

  it("ignores a weigh-in dated in the future and an unreadable one", () => {
    const hub = ProgressHub_build(
      input({
        stats: {
          weight: {
            weight: [
              { vtype: "stat", value: { value: 79.8, unit: "kg" }, timestamp: now - day },
              { vtype: "stat", value: { value: 95, unit: "kg" }, timestamp: now + 3 * day },
              { vtype: "stat", value: { value: 0, unit: "kg" }, timestamp: now - 60 * 1000 },
            ],
          },
          length: {},
          percentage: {},
        },
      })
    );
    expect(hub.weight).to.deep.equal({ value: "79.8 kg", subtitle: "Logged yesterday", change: undefined });
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

  it("keeps a 00:30 workout on the first day of the 28-day window across the 25-hour day", () => {
    inTimeZone("America/New_York", () => {
      const history = [{ startTime: new Date(2026, 10, 1, 0, 30).getTime() } as IHistoryRecord];
      for (const hour of [23, 0]) {
        const at = new Date(2026, 10, 28, hour, 30).getTime();
        expect(ProgressHub_build(input({ history, now: at })).consistency.done).to.equal(1);
      }
      expect(
        ProgressHub_build(input({ history, now: new Date(2026, 10, 29, 0, 30).getTime() })).consistency.done
      ).to.equal(0);
    });
  });

  it("finds this week and last week at 23:30 and 00:30 on Sunday and Monday", () => {
    for (const [at, startsMonday, thisWeek, lastWeek] of [
      [new Date(2026, 10, 15, 23, 30), true, new Date(2026, 10, 9), new Date(2026, 10, 2)],
      [new Date(2026, 10, 16, 0, 30), true, new Date(2026, 10, 16), new Date(2026, 10, 9)],
      [new Date(2026, 10, 14, 23, 30), false, new Date(2026, 10, 8), new Date(2026, 10, 1)],
      [new Date(2026, 10, 15, 0, 30), false, new Date(2026, 10, 15), new Date(2026, 10, 8)],
    ] as [Date, boolean, Date, Date][]) {
      expect(ProgressHub_weekRanges(at.getTime(), startsMonday)).to.deep.equal({
        thisWeekStart: thisWeek.getTime(),
        lastWeekStart: lastWeek.getTime(),
      });
    }
  });

  it("puts last week at local midnight when the week crosses the autumn clock change", () => {
    inTimeZone("America/New_York", () => {
      const ranges = ProgressHub_weekRanges(new Date(2026, 10, 3, 0, 30).getTime(), true);
      expect(ranges.thisWeekStart).to.equal(new Date(2026, 10, 2).getTime());
      expect(ranges.lastWeekStart).to.equal(new Date(2026, 9, 26).getTime());
    });
  });
});
