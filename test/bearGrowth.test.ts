import "mocha";
import { expect } from "chai";
import sinon from "sinon";
import { BearGrowth_countedKg, BearGrowth_history } from "../src/models/bearGrowth";
import { Settings_build } from "../src/models/settings";
import { Weight_build } from "../src/models/weight";
import { IHistoryRecord, ISet } from "../src/types";

const settings = Settings_build();
const start = new Date(2026, 9, 10, 12).getTime();
const minuteMs = 60000;
const dayMs = 86400000;

function set(kg: number, reps: number = 10, completed: boolean = true): ISet {
  return {
    vtype: "set",
    id: "s",
    index: 0,
    completedWeight: Weight_build(kg, "kg"),
    completedReps: reps,
    isCompleted: completed,
  };
}

function workout(at: number = start, minutes: number = 30, sets: ISet[] = [set(100)]): IHistoryRecord {
  return {
    vtype: "history_record",
    id: at,
    date: new Date(at).toISOString(),
    startTime: at,
    endTime: at + minutes * minuteMs,
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
        sets,
      },
    ],
  };
}

describe("BearGrowth", () => {
  it("counts at ten minutes and rejects one millisecond less", () => {
    const record = workout(start, 10);
    expect(BearGrowth_countedKg(record, [], settings)).to.equal(1000);
    expect(BearGrowth_countedKg({ ...record, endTime: record.endTime! - 1 }, [], settings)).to.equal(0);
  });

  it("requires a completed working set and ignores warmups and unfinished sets", () => {
    const record = workout(start, 30, [set(100, 10, false)]);
    record.entries[0].warmupSets = [set(100)];
    expect(BearGrowth_countedKg(record, [], settings)).to.equal(0);
    record.entries[0].sets.push(set(50));
    expect(BearGrowth_countedKg(record, [], settings)).to.equal(500);
  });

  it("caps new exercises at twice measured bodyweight, or 120 kg without it", () => {
    const record = workout(start, 30, [set(200)]);
    expect(BearGrowth_countedKg(record, [], settings, Weight_build(80, "kg"))).to.equal(1600);
    expect(BearGrowth_countedKg(record, [], settings)).to.equal(1200);
    expect(BearGrowth_countedKg(record, [], settings, Weight_build(0, "kg"))).to.equal(1200);
    expect(BearGrowth_countedKg(record, [], settings, Weight_build(80 / 0.45359237, "lb"))).to.be.closeTo(1600, 0.01);
  });

  it("caps each later set at 1.3 times the earlier completed best for that exercise", () => {
    const earlier = workout(start - dayMs, 30, [set(100), set(1000, 10, false)]);
    const record = workout(start, 30, [set(200), set(50)]);
    expect(BearGrowth_countedKg(record, [earlier], settings)).to.equal(1800);
    record.entries[0].exercise = { id: "squat", equipment: "barbell" };
    expect(BearGrowth_countedKg(record, [earlier], settings)).to.equal(1700);
  });

  it("does not let a later set in the same workout raise its cap", () => {
    expect(BearGrowth_countedKg(workout(start, 30, [set(120), set(200)]), [], settings)).to.equal(2400);
  });

  it("uses 0.6 times bodyweight per rep for zero kg sets", () => {
    const record = workout(start, 30, [set(0)]);
    record.entries[0].exercise = { id: "pullUp", equipment: "bodyweight" };
    expect(BearGrowth_countedKg(record, [], settings, Weight_build(80, "kg"))).to.equal(480);
    expect(BearGrowth_countedKg(record, [], settings)).to.equal(0);
  });

  it("applies the per-minute cap to the twelve-minute, forty-thousand-kg example", () => {
    expect(BearGrowth_countedKg(workout(start, 12, [set(100, 400)]), [], settings)).to.equal(2400);
  });

  it("caps even a long workout at 25000 kg", () => {
    expect(BearGrowth_countedKg(workout(start, 180, [set(100, 400)]), [], settings)).to.equal(25000);
  });

  it("uses active intervals rather than a pause to pass ten minutes", () => {
    const record = workout(start, 60);
    record.intervals = [
      [start, start + 9 * minuteMs],
      [start + 59 * minuteMs, start + 60 * minuteMs],
    ];
    expect(BearGrowth_countedKg(record, [], settings)).to.equal(1000);
    record.intervals[1][1] = start + 59.5 * minuteMs;
    expect(BearGrowth_countedKg(record, [], settings)).to.equal(0);
  });

  it("never reads the clock for open workouts or open intervals", () => {
    const clock = sinon.stub(Date, "now").throws(new Error("clock read"));
    try {
      expect(BearGrowth_countedKg({ ...workout(), endTime: undefined }, [], settings)).to.equal(0);
      expect(BearGrowth_countedKg({ ...workout(), intervals: [[start, undefined]] }, [], settings)).to.equal(0);
      expect(BearGrowth_countedKg(workout(), [], settings)).to.equal(1000);
      expect(BearGrowth_countedKg(workout(-600000, 10), [], settings)).to.equal(1000);
      expect(BearGrowth_countedKg({ ...workout(-600000, 10), intervals: [[-600000, 0]] }, [], settings)).to.equal(1000);
      expect(clock.callCount).to.equal(0);
    } finally {
      clock.restore();
    }
  });

  it("counts one qualifying workout per local calendar day", () => {
    const first = workout();
    const second = workout(start + 2 * 3600000);
    expect(BearGrowth_countedKg(second, [first], settings)).to.equal(0);
    expect(BearGrowth_history([second, first], settings).workouts.map(({ record }) => record.id)).to.deep.equal([
      first.id,
    ]);
    expect(BearGrowth_history([workout(start, 9), second], settings).countedKg).to.equal(1000);
  });

  it("counts two workouts on opposite sides of local midnight", () => {
    const first = workout(new Date(2026, 9, 10, 23, 30).getTime(), 10);
    const second = workout(new Date(2026, 9, 11, 0, 10).getTime(), 10);
    expect(BearGrowth_history([second, first], settings).workouts).to.have.length(2);
  });

  it("processes imports in date order without mutating their order", () => {
    const first = workout(start, 30, [set(50)]);
    const second = workout(start + dayMs, 30, [set(100)]);
    const third = workout(start + 2 * dayMs, 30, [set(200)]);
    const imported = [third, first, second];
    const result = BearGrowth_history(imported, settings);
    expect(result.workouts.map(({ countedKg }) => countedKg)).to.deep.equal([500, 650, 1300]);
    expect(result.countedKg).to.equal(2450);
    expect(imported).to.deep.equal([third, first, second]);
  });

  it("uses only bodyweight logged before the workout", () => {
    const record = workout(start, 30, [set(200)]);
    const stats = {
      weight: {
        weight: [
          { vtype: "stat" as const, value: Weight_build(80, "kg"), timestamp: start - 1 },
          { vtype: "stat" as const, value: Weight_build(200, "kg"), timestamp: start + dayMs },
        ],
      },
      length: {},
      percentage: {},
    };
    expect(BearGrowth_history([record], settings, stats).countedKg).to.equal(1600);
    expect(
      BearGrowth_history([record], settings, { ...stats, weight: { weight: stats.weight.weight.slice(1) } }).countedKg
    ).to.equal(1200);
  });

  it("converts pounds and counts both sides and two dumbbells", () => {
    const record = workout(start, 30, [
      { ...set(20, 5), completedRepsLeft: 5, isUnilateral: true, completedWeight: Weight_build(20 / 0.45359237, "lb") },
    ]);
    record.entries[0].exercise.equipment = "dumbbell";
    expect(BearGrowth_countedKg(record, [], settings)).to.be.closeTo(400, 0.01);
  });

  it("keeps zero-volume qualifying workouts for energy and the daily limit", () => {
    const result = BearGrowth_history([workout(start, 30, [set(0)]), workout(start + 3600000)], settings);
    expect(result.workouts).to.have.length(1);
    expect(result.countedKg).to.equal(0);
  });
});
