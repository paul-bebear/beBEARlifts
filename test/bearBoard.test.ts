import "mocha";
import { expect } from "chai";
import { BearBoard_tiles, IBearBoardInput } from "../src/models/bearBoard";
import { Notes_empty, INote } from "../src/models/notes";
import { Weight_build } from "../src/models/weight";
import { IHistoryRecord, IStatsWeightValue } from "../src/types";

const hourMs = 3600000;
const dayMs = 24 * hourMs;
const now = new Date(2026, 9, 22, 12).getTime();
const weekStart = new Date(2026, 9, 19).getTime();

function record(endTime: number): IHistoryRecord {
  return {
    vtype: "history_record",
    id: endTime,
    date: new Date(endTime).toISOString(),
    startTime: endTime - hourMs,
    endTime,
    programId: "p",
    programName: "P",
    day: 1,
    dayName: "Day",
    entries: [],
  };
}

function weight(at: number, kg: number): IStatsWeightValue {
  return { vtype: "stat", value: Weight_build(kg, "kg"), timestamp: at };
}

function checkIn(day: string, energy: 1 | 2 | 3 | 4 | 5): INote {
  return {
    id: day,
    day,
    createdAt: now,
    updatedAt: now,
    kind: "checkIn",
    title: "",
    body: "",
    energy,
  };
}

function input(overrides: Partial<IBearBoardInput> = {}): IBearBoardInput {
  return {
    history: [],
    workouts: [],
    stats: { weight: {}, length: {}, percentage: {} },
    notes: Notes_empty(),
    units: "kg",
    plannedPerWeek: 3,
    weekStart,
    now,
    ...overrides,
  };
}

describe("BearBoard", () => {
  it("shows four tiles with empty values for a new user", () => {
    expect(BearBoard_tiles(input()).map((t) => [t.id, t.value, t.label, t.target])).to.deep.equal([
      ["week", "0 of 3", "workouts this week", "streak"],
      ["weight", "–", "log your weight", "stats"],
      ["perWorkout", "–", "per workout, 30 d", "reportsHub"],
      ["energy", "–", "check in today", "journal"],
    ]);
  });

  it("counts only this week's finished workouts", () => {
    const history = [
      record(weekStart - hourMs),
      record(weekStart + hourMs),
      record(now - hourMs),
      record(now + hourMs),
    ];
    expect(BearBoard_tiles(input({ history }))[0].value).to.equal("2 of 3");
  });

  it("shows the latest weight and the change over 30 days in the user's units", () => {
    const stats = {
      weight: { weight: [weight(now - 40 * dayMs, 70), weight(now - 31 * dayMs, 71), weight(now - dayMs, 72.4)] },
      length: {},
      percentage: {},
    };
    const tile = BearBoard_tiles(input({ stats }))[1];
    expect([tile.value, tile.label]).to.deep.equal(["72.4 kg", "weight · +1.4 in 30 d"]);
    const lb = BearBoard_tiles(input({ stats, units: "lb" }))[1];
    expect(lb.value).to.equal("159.5 lb");
  });

  it("shows a single weight without a change", () => {
    const stats = { weight: { weight: [weight(now - dayMs, 64)] }, length: {}, percentage: {} };
    expect(BearBoard_tiles(input({ stats }))[1].label).to.equal("weight");
  });

  it("averages counted kg over workouts in the last 30 days that added kg", () => {
    const workouts = [
      { record: record(now - 40 * dayMs), countedKg: 9000 },
      { record: record(now - 5 * dayMs), countedKg: 3000 },
      { record: record(now - 3 * dayMs), countedKg: 0 },
      { record: record(now - dayMs), countedKg: 4000 },
    ];
    expect(BearBoard_tiles(input({ workouts }))[2].value).to.equal("3,500 kg");
  });

  it("averages energy check-ins over the last 7 days", () => {
    const notes = {
      ...Notes_empty(),
      notes: [checkIn("2026-10-22", 5), checkIn("2026-10-20", 4), checkIn("2026-10-01", 1)],
    };
    const tile = BearBoard_tiles(input({ notes }))[3];
    expect([tile.value, tile.label]).to.deep.equal(["4.5 / 5", "energy, 7 d"]);
  });
});
