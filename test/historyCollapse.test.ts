import "mocha";
import { expect } from "chai";
import {
  HistoryCollapse_expand,
  HistoryCollapse_isExpanded,
  HistoryCollapse_summary,
  HistoryCollapse_toggle,
} from "../src/models/historyCollapse";
import { Exercise_toKey } from "../src/models/exercise";
import { IHistoryEntry, IHistoryRecord, ISet } from "../src/types";

const bench = { id: "benchpress", equipment: "barbell" };
const squat = { id: "squat", equipment: "barbell" };

function set(reps: number, done: boolean): ISet {
  return {
    vtype: "set",
    id: String(Math.random()),
    index: 0,
    reps,
    isAmrap: false,
    isCompleted: done,
    completedReps: done ? reps : undefined,
  };
}

function entry(exercise: IHistoryEntry["exercise"], sets: ISet[]): IHistoryEntry {
  return { vtype: "history_entry", index: 0, id: String(Math.random()), exercise, sets, warmupSets: [] };
}

function record(id: number, entries: IHistoryEntry[], minutes = 45): IHistoryRecord {
  const start = 1_700_000_000_000;
  return {
    vtype: "history_record",
    id,
    date: new Date(start).toISOString(),
    programId: "p",
    programName: "P",
    day: 1,
    dayName: "Day 1",
    startTime: start,
    endTime: start + minutes * 60 * 1000,
    entries,
  };
}

describe("HistoryCollapse", () => {
  it("starts past workouts collapsed and the current workout expanded", () => {
    expect(HistoryCollapse_isExpanded(record(12, []), {})).to.equal(false);
    expect(HistoryCollapse_isExpanded(record(0, []), {})).to.equal(true);
  });

  it("toggles a workout open and closed without touching the others", () => {
    const open = HistoryCollapse_toggle({ 3: true }, 7);
    expect(open).to.deep.equal({ 3: true, 7: true });
    expect(HistoryCollapse_toggle(open, 7)).to.deep.equal({ 3: true, 7: false });
  });

  it("expands a scroll target and keeps the same object when it is open or missing", () => {
    expect(HistoryCollapse_expand({}, 5)).to.deep.equal({ 5: true });
    const open = { 5: true };
    expect(HistoryCollapse_expand(open, 5)).to.equal(open);
    expect(HistoryCollapse_expand(open, undefined)).to.equal(open);
  });

  it("counts exercises, finished sets and minutes", () => {
    const r = record(9, [entry(bench, [set(5, true), set(5, true), set(5, false)]), entry(squat, [set(5, true)])], 62);
    const summary = HistoryCollapse_summary(r);
    expect(summary.exercises).to.equal(2);
    expect(summary.sets).to.equal(3);
    expect(summary.duration).to.equal("01:02 h");
    expect(summary.hasPr).to.equal(false);
  });

  it("formats a short workout in minutes", () => {
    expect(HistoryCollapse_summary(record(9, []), undefined).duration).to.equal("45 min");
  });

  it("flags a PR only when an exercise in this record has one", () => {
    const r = record(9, [entry(bench, [set(5, true)])]);
    const prSet = set(5, true);
    const withPr = { 9: { [Exercise_toKey(bench)]: { maxWeightSet: prSet } } };
    const otherRecord = { 10: { [Exercise_toKey(bench)]: { maxWeightSet: prSet } } };
    const emptyPr = { 9: { [Exercise_toKey(bench)]: {} } };
    expect(HistoryCollapse_summary(r, withPr).hasPr).to.equal(true);
    expect(HistoryCollapse_summary(r, otherRecord).hasPr).to.equal(false);
    expect(HistoryCollapse_summary(r, emptyPr).hasPr).to.equal(false);
  });
});
