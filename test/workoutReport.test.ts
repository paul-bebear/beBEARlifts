import "mocha";
import { expect } from "chai";
import { IEffort, IHistoryRecord, ISet } from "../src/types";
import { Settings_build } from "../src/models/settings";
import {
  WorkoutReport_answer,
  WorkoutReport_build,
  WorkoutReport_empty,
  WorkoutReport_facts,
  WorkoutReport_options,
  WorkoutReport_parseLog,
  WorkoutReport_previous,
  WorkoutReport_put,
  WorkoutReport_weekLine,
  WorkoutReport_weeks,
} from "../src/models/workoutReport";

const settings = { ...Settings_build(), units: "kg" as const };
const day = 24 * 3600 * 1000;
const start = Date.UTC(2026, 9, 20, 18);

interface ISetSpec {
  kg: number;
  reps: number;
  done?: number;
  minReps?: number;
  effort?: IEffort;
}

function set(spec: ISetSpec): ISet {
  return {
    id: "s",
    index: 0,
    reps: spec.reps,
    minReps: spec.minReps,
    weight: { value: spec.kg, unit: "kg" },
    completedWeight: { value: spec.kg, unit: "kg" },
    completedReps: spec.done ?? spec.reps,
    completedEffort: spec.effort,
    isCompleted: true,
  } as ISet;
}

function workout(id: number, daysAgo: number, entries: Record<string, ISetSpec[]>): IHistoryRecord {
  return {
    id,
    startTime: start - daysAgo * day,
    dayName: "Legs",
    entries: Object.entries(entries).map(([exercise, sets]) => ({
      exercise: { id: exercise, equipment: "barbell" },
      sets: sets.map(set),
      warmupSets: [],
    })),
  } as unknown as IHistoryRecord;
}

const three = (kg: number, reps: number, effort?: IEffort): ISetSpec[] => [1, 2, 3].map(() => ({ kg, reps, effort }));

describe("WorkoutReport", () => {
  const history = [
    workout(1, 7, { squat: three(100, 5), legExtension: three(50, 12) }),
    workout(2, 14, { squat: three(100, 5), legExtension: three(50, 12) }),
  ];

  it("asks about a lift well under the usual weight", () => {
    const today = workout(3, 0, { squat: three(100, 5), legExtension: three(40, 12) });
    const report = WorkoutReport_build(today, history, undefined, settings);
    expect(report.items.map((i) => [i.kind, i.asks])).to.deep.equal([["lighter", true]]);
    expect(report.items[0].text).to.equal("Leg Extension: 40 kg, 10 kg under your usual 50 kg.");
  });

  it("notes a heavier lift without asking", () => {
    const today = workout(3, 0, { squat: three(105, 5) });
    const [heavier] = WorkoutReport_build(today, history, undefined, settings).items;
    expect(heavier.kind).to.equal("heavier");
    expect(heavier.asks).to.equal(false);
  });

  it("asks about far fewer reps at the same weight", () => {
    const today = workout(3, 0, {
      squat: [
        { kg: 100, reps: 5 },
        { kg: 100, reps: 5, done: 3 },
        { kg: 100, reps: 5, done: 2 },
      ],
    });
    const kinds = WorkoutReport_build(today, history, undefined, settings).items.map((i) => i.kind);
    expect(kinds).to.deep.equal(["fewerReps"]);
  });

  it("reads the effort ratings: too hard keeps the weight, all easy adds weight", () => {
    const today = workout(3, 0, { squat: three(100, 5, "hard"), legExtension: three(50, 12, "easy") });
    const items = WorkoutReport_build(today, history, undefined, settings).items;
    expect(items.map((i) => i.kind)).to.deep.equal(["tooHard", "tooEasy"]);
  });

  it("asks about missed minimum reps on a lift with no history", () => {
    const today = workout(3, 0, { deadlift: [{ kg: 140, reps: 5, done: 3, minReps: 5 }] });
    const [missed] = WorkoutReport_build(today, [], undefined, settings).items;
    expect(missed.kind).to.equal("missed");
    expect(WorkoutReport_options(missed)).to.include("hurt");
  });

  it("ignores workouts older than four weeks", () => {
    const old = [workout(1, 40, { squat: three(140, 5) })];
    expect(WorkoutReport_build(workout(3, 0, { squat: three(100, 5) }), old, undefined, settings).items).to.deep.equal(
      []
    );
  });

  it("follows up next time on a lift that hurt", () => {
    const first = WorkoutReport_build(workout(3, 0, { legExtension: three(40, 12) }), history, undefined, settings);
    const answered = WorkoutReport_answer(first, first.items[0].key, "hurt");
    const next = WorkoutReport_build(workout(4, -3, { legExtension: three(45, 12) }), history, answered, settings);
    const followUp = next.items.find((i) => i.kind === "followUp")!;
    expect(followUp.text).to.equal("Last time you said Leg Extension hurt. How was it today?");
    expect(WorkoutReport_options(followUp)).to.deep.equal(["better", "same", "worse"]);
  });

  it("gives the AI each fact with the user's answer", () => {
    const report = WorkoutReport_build(workout(3, 0, { legExtension: three(40, 12) }), history, undefined, settings);
    const facts = WorkoutReport_facts(WorkoutReport_answer(report, report.items[0].key, "onPurpose"));
    expect(facts[0]).to.match(/The user answered: On purpose\.$/);
  });

  it("stores reports, finds the previous one, and counts per week", () => {
    const a = WorkoutReport_build(workout(3, 7, { legExtension: three(40, 12) }), history, undefined, settings);
    const b = WorkoutReport_answer(
      WorkoutReport_build(workout(4, 0, { legExtension: three(40, 12) }), history, a, settings),
      "x",
      "hurt"
    );
    const log = WorkoutReport_put(WorkoutReport_put(WorkoutReport_empty(), a), b);
    expect(WorkoutReport_previous(log, b.timestamp)?.workoutId).to.equal(3);
    expect(WorkoutReport_parseLog(JSON.parse(JSON.stringify(log)))).to.deep.equal(log);
    const weeks = WorkoutReport_weeks(log, true);
    expect(weeks.reduce((n, w) => n + w.workouts, 0)).to.equal(2);
    expect(weeks.reduce((n, w) => n + w.lighter, 0)).to.equal(2);
  });

  it("writes one line per week with only the counts that happened", () => {
    const week = { weekStart: 0, workouts: 3, heavier: 2, lighter: 0, tooHard: 1, tooEasy: 0, hurt: 1 };
    expect(WorkoutReport_weekLine(week)).to.equal("3 workouts · 2 heavier · 1 too hard · 1 hurt or worse");
  });
});
