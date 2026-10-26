import "mocha";
import { expect } from "chai";
import { GymBagCheck_items, GymBagCheck_plan, IGymBagCheckDay } from "../src/models/gymBagCheck";
import { Settings_build } from "../src/models/settings";
import { Weight_build } from "../src/models/weight";
import { IScheduleProgram, WeekSchedule_empty, WeekSchedule_save } from "../src/models/weekSchedule";
import { IHistoryEntry, IHistoryRecord, ISet } from "../src/types";

const settings = Settings_build();
const hourMs = 3600000;
// 2026-10-26 is a Monday.
const monday = new Date(2026, 9, 26, 12).getTime();

function set(index: number, kg: number, completedReps?: number): ISet {
  return {
    vtype: "set",
    index,
    id: `s${index}`,
    reps: 5,
    weight: Weight_build(kg, "kg"),
    completedReps,
    completedWeight: completedReps != null ? Weight_build(kg, "kg") : undefined,
  };
}

function entry(id: string, kgs: number[], completedReps?: number): IHistoryEntry {
  return {
    vtype: "history_entry",
    exercise: { id, equipment: "barbell" },
    sets: kgs.map((kg, i) => set(i, kg, completedReps)),
    warmupSets: [],
    index: 0,
    id: `${id}-entry`,
  };
}

function record(entries: IHistoryEntry[], startTime: number = monday): IHistoryRecord {
  return {
    vtype: "history_record",
    id: startTime,
    date: new Date(startTime).toISOString(),
    startTime,
    endTime: startTime + hourMs,
    programId: "p",
    programName: "P",
    day: 1,
    dayName: "Push",
    entries,
  };
}

function day(entries: IHistoryEntry[], overrides: Partial<IGymBagCheckDay> = {}): IGymBagCheckDay {
  return { name: "Push day", record: record(entries), isRest: false, ...overrides };
}

const ids = (check: { items: { id: string }[] }): string[] => check.items.map((item) => item.id);

describe("GymBagCheck_items", () => {
  it("titles the day with its exercise count and minutes, and always packs water", () => {
    const check = GymBagCheck_items(
      day([entry("benchPress", [60, 60, 60]), entry("benchPress", [40, 40, 40, 40, 40, 40])]),
      [],
      settings
    );
    expect(check.title).to.equal("Push day · 2 exercises · about 25 min");
    expect(ids(check)).to.deep.equal(["water"]);
    expect(check.button).to.equal("Let's go");
    expect(check.isRest).to.equal(false);
  });

  it("packs a belt for a squat at 80 percent of the best and not below it", () => {
    const history = [record([entry("squat", [100], 5)], monday - 7 * 24 * hourMs)];
    expect(ids(GymBagCheck_items(day([entry("squat", [80, 80])]), history, settings))).to.include("belt");
    expect(ids(GymBagCheck_items(day([entry("squat", [79])]), history, settings))).to.not.include("belt");
    expect(ids(GymBagCheck_items(day([entry("squat", [200])]), [], settings))).to.not.include("belt");
  });

  it("ignores sets the user did not finish when it looks for the best", () => {
    const history = [record([entry("deadlift", [200])], monday - 7 * 24 * hourMs)];
    expect(ids(GymBagCheck_items(day([entry("deadlift", [100])]), history, settings))).to.not.include("belt");
  });

  it("packs straps for a row or a deadlift and shoes for a run", () => {
    expect(ids(GymBagCheck_items(day([entry("bentOverRow", [50])]), [], settings))).to.deep.equal(["water", "straps"]);
    expect(ids(GymBagCheck_items(day([entry("deadlift", [100])]), [], settings))).to.deep.equal(["water", "straps"]);
    const withRun = {
      ...settings,
      exercises: {
        ...settings.exercises,
        easyrun: {
          vtype: "custom_exercise" as const,
          id: "easyrun",
          name: "Easy run",
          isDeleted: false,
          meta: { targetMuscles: [], synergistMuscles: [], bodyParts: [], sortedEquipment: [] },
        },
      },
    };
    expect(ids(GymBagCheck_items(day([entry("easyrun", [0])]), [], withRun))).to.include("shoes");
  });

  it("words the rest day with the next day and offers to train anyway", () => {
    const check = GymBagCheck_items(
      day([entry("bentOverRow", [50])], { name: "Pull", isRest: true, nextWeekday: "Thursday" }),
      [],
      settings
    );
    expect(check.title).to.equal("Rest day · next: Pull on Thursday");
    expect(check.button).to.equal("Train anyway");
    expect(ids(check)).to.deep.equal(["water", "straps"]);
    expect(GymBagCheck_items(day([], { name: "Pull", isRest: true }), [], settings).title).to.equal(
      "Rest day · next: Pull"
    );
  });

  it("names a day without a name or exercises plainly", () => {
    expect(GymBagCheck_items({ name: " ", isRest: false }, [], settings).title).to.equal("Workout");
  });
});

describe("GymBagCheck_plan", () => {
  const program: IScheduleProgram & { id: string } = {
    id: "p",
    nextDay: 2,
    weeks: [{ days: [{ name: "Push" }, { name: "Pull" }, { name: "Legs" }] }],
  };
  const opts = { now: monday, workedOutToday: false, hasProgress: false };

  it("starts today's planned day when the week puts one on today", () => {
    const log = WeekSchedule_save(WeekSchedule_empty(), "p", [0, null, 1, null, 2, null, null]);
    expect(GymBagCheck_plan(program, log, opts)).to.deep.equal({ kind: "today", day: 1, name: "Push" });
  });

  it("names the next day and its weekday on a rest day", () => {
    const log = WeekSchedule_save(WeekSchedule_empty(), "p", [null, 0, null, 1, null, 2, null]);
    expect(GymBagCheck_plan(program, log, opts)).to.deep.equal({
      kind: "rest",
      day: 2,
      name: "Pull",
      nextWeekday: "Thursday",
    });
  });

  it("starts the next day in order after a workout today", () => {
    const log = WeekSchedule_save(WeekSchedule_empty(), "p", [0, null, 1, null, 2, null, null]);
    expect(GymBagCheck_plan(program, log, { ...opts, workedOutToday: true })).to.deep.equal({
      kind: "next",
      day: 2,
      name: "Pull",
    });
  });
});
