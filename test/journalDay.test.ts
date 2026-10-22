import "mocha";
import { expect } from "chai";
import { Settings_build } from "../src/models/settings";
import { History_getPersonalRecords } from "../src/models/history";
import { FoodLog_empty, IFoodEntry, IFoodLog } from "../src/models/foodLog";
import { IMusicLog, MusicLog_empty } from "../src/models/musicLog";
import { IMusicPlay } from "../src/models/musicSession";
import { Notes_empty, Notes_new, Notes_save, Notes_updateCheckIn } from "../src/models/notes";
import {
  IJournalDayInput,
  JournalDay_build,
  JournalDay_mindfulness,
  JournalDay_mindfulnessLines,
} from "../src/models/journalDay";
import { IExerciseType, IHistoryEntry, IHistoryRecord, ISet, IStatsWeightValue } from "../src/types";

function at(day: string, hour: number, minute: number = 0): number {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(y, m - 1, d, hour, minute).getTime();
}

const squat: IExerciseType = { id: "squat", equipment: "barbell" };

function set(weight: number, reps: number): ISet {
  return {
    vtype: "set",
    index: 0,
    reps,
    weight: { value: weight, unit: "kg" },
    completedWeight: { value: weight, unit: "kg" },
    completedReps: reps,
    isCompleted: true,
  } as ISet;
}

function entry(sets: ISet[]): IHistoryEntry {
  return { vtype: "history_entry", index: 0, id: "squat", exercise: squat, sets, warmupSets: [] };
}

function workout(start: number, dayName: string, sets: ISet[], minutes: number = 48): IHistoryRecord {
  return {
    vtype: "history_record",
    date: new Date(start).toISOString(),
    programId: "p",
    programName: "beBEAR",
    day: 1,
    dayName,
    entries: [entry(sets)],
    startTime: start,
    endTime: start + minutes * 60000,
    id: start,
  };
}

function food(id: string, day: string, calories: number, protein: number): IFoodEntry {
  return {
    id,
    day,
    meal: "lunch",
    name: "Rice and chicken",
    source: "manual",
    nutrients: { calories, protein, carbs: 100, fat: 10 },
    createdAt: at(day, 12),
  };
}

function play(id: string, name: string, isKept: boolean, startedAt: number): IMusicPlay {
  return {
    track: { id, uri: `spotify:track:${id}`, name, artists: "Artist", durationMs: 180000 },
    startedAt,
    heardMs: 170000,
    source: "live",
    isKept,
  };
}

const today = "2026-10-22";
const settings = { ...Settings_build(), units: "kg" as const };

function input(extra: Partial<IJournalDayInput> = {}): IJournalDayInput {
  const history = extra.history ?? [];
  return {
    day: today,
    today,
    history,
    settings,
    prs: History_getPersonalRecords(history),
    food: FoodLog_empty(),
    music: MusicLog_empty(),
    weights: [],
    notes: Notes_empty(),
    isOngoingProgress: false,
    ...extra,
  };
}

describe("JournalDay", () => {
  it("shows today's empty day with a Start button and the day's mindfulness line", () => {
    const day = JournalDay_build(input());
    expect(day.title).to.equal("Today, Oct 22");
    expect(day.isToday).to.equal(true);
    expect(day.workouts).to.eql([]);
    expect(day.plan).to.eql({ kind: "start", label: "Start workout" });
    expect(day.mealCount).to.equal(0);
    expect(day.notes).to.eql([]);
    expect(day.chips).to.eql([]);
    expect(day.mindfulness).to.equal(JournalDay_mindfulness(today));
  });

  it("reads Resume when a workout is running today", () => {
    expect(JournalDay_build(input({ isOngoingProgress: true })).plan).to.eql({
      kind: "start",
      label: "Resume workout",
    });
  });

  it("calls a past day without a workout a rest day", () => {
    expect(JournalDay_build(input({ day: "2026-10-21" })).plan).to.eql({ kind: "rest" });
  });

  it("shows the day's finished workouts in order, with stats, records and a chip", () => {
    const history = [
      workout(at(today, 18), "Legs", [set(100, 5), set(100, 5)]),
      workout(at("2026-10-15", 18), "Legs", [set(90, 5)]),
      workout(at(today, 7), "Arms", [set(20, 10)], 30),
    ];
    const day = JournalDay_build(input({ history }));
    expect(day.plan).to.equal(undefined);
    expect(day.workouts.map((w) => w.dayName)).to.eql(["Arms", "Legs"]);
    expect(day.workouts[1].statsLine).to.equal("48 min · 1,000 kg · 2 sets");
    expect(day.workouts[1].prs).to.eql(["Squat 100 kg × 5"]);
    expect(day.chips).to.eql(["Arms · 30 min", "Legs · 48 min"]);
  });

  it("skips an unfinished record and names a workout without a day name", () => {
    const running = { ...workout(at(today, 9), "Push", [set(50, 5)]), endTime: undefined };
    const unnamed = workout(at(today, 10), "  ", [set(50, 5)], 75);
    const day = JournalDay_build(input({ history: [running, unnamed] }));
    expect(day.workouts.map((w) => w.chip)).to.eql(["Workout · 1 h 15 min"]);
  });

  it("counts the day's meals and adds a food chip", () => {
    const log: IFoodLog = {
      ...FoodLog_empty(),
      entries: [food("a", today, 500, 40), food("b", today, 300, 20), food("c", "2026-10-21", 900, 10)],
    };
    const day = JournalDay_build(input({ food: log }));
    expect(day.mealCount).to.equal(2);
    expect(day.totals.calories).to.equal(800);
    expect(day.chips).to.eql(["2 foods logged"]);
  });

  it("lists the kept songs of the day's workouts once each", () => {
    const start = at(today, 18);
    const music: IMusicLog = {
      ...MusicLog_empty(),
      sessions: [
        {
          id: start,
          startedAt: start,
          plays: [play("1", "One", true, start), play("2", "Two", false, start), play("1", "One", true, start)],
        },
      ],
    };
    const day = JournalDay_build(input({ history: [workout(start, "Legs", [set(100, 5)])], music }));
    expect(day.songs).to.eql([{ id: "1", name: "One", artists: "Artist" }]);
  });

  it("shows the latest weigh-in of that day only", () => {
    const weights: IStatsWeightValue[] = [
      { vtype: "stat", value: { value: 70, unit: "kg" }, timestamp: at(today, 7) },
      { vtype: "stat", value: { value: 70.4, unit: "kg" }, timestamp: at(today, 21) },
      { vtype: "stat", value: { value: 71, unit: "kg" }, timestamp: at("2026-10-21", 7) },
    ];
    expect(JournalDay_build(input({ weights })).weight).to.eql({ value: 70.4, unit: "kg" });
    expect(JournalDay_build(input({ weights, day: "2026-10-20" })).weight).to.equal(undefined);
  });

  it("splits the day's check-in from its notes, newest note first", () => {
    let notes = Notes_save(Notes_empty(), { ...Notes_new("a", today, 1), title: "Morning" }, 1);
    notes = Notes_save(notes, { ...Notes_new("b", today, 2), title: "Night" }, 2);
    notes = Notes_updateCheckIn(notes, { day: today, newId: "k", now: 3, field: "energy", value: 3 });
    const day = JournalDay_build(input({ notes }));
    expect(day.checkIn?.energy).to.equal(3);
    expect(day.notes.map((n) => n.title)).to.eql(["Night", "Morning"]);
  });

  it("picks a mindfulness line by day, the same all day, a new one the next day", () => {
    expect(JournalDay_mindfulness("2026-10-22")).to.equal(JournalDay_mindfulness("2026-10-22"));
    expect(JournalDay_mindfulness("2026-10-22")).to.not.equal(JournalDay_mindfulness("2026-10-23"));
    const days = JournalDay_mindfulnessLines.map((_, i) => `2026-11-${`${i + 1}`.padStart(2, "0")}`);
    expect(new Set(days.map(JournalDay_mindfulness)).size).to.equal(JournalDay_mindfulnessLines.length);
  });
});
