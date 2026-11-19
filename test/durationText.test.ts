import "mocha";
import { expect } from "chai";
import { Settings_build } from "../src/models/settings";
import { History_getPersonalRecords } from "../src/models/history";
import { FoodLog_empty } from "../src/models/foodLog";
import { MusicLog_empty } from "../src/models/musicLog";
import { Notes_empty } from "../src/models/notes";
import { JournalDay_build } from "../src/models/journalDay";
import { IWorkoutPostSummary, WorkoutPost_statsLine } from "../src/models/workoutPost";
import { DurationText_fromMs } from "../src/models/durationText";
import { IHistoryRecord } from "../src/types";

const minute = 60000;
const hour = 60 * minute;

const day = "2026-10-20";
const start = new Date(2026, 9, 20, 18).getTime();

function journalChip(durationMs: number): string {
  const record: IHistoryRecord = {
    vtype: "history_record",
    date: new Date(start).toISOString(),
    programId: "p",
    programName: "beBEAR",
    day: 1,
    dayName: "Legs",
    entries: [],
    startTime: start,
    endTime: start + durationMs,
    id: start,
  };
  const history = [record];
  const journal = JournalDay_build({
    day,
    today: day,
    history,
    settings: Settings_build(),
    prs: History_getPersonalRecords(history),
    food: FoodLog_empty(),
    music: MusicLog_empty(),
    weights: [],
    notes: Notes_empty(),
  });
  return journal.workouts[0].chip.replace("Legs · ", "");
}

function postStats(durationMs: number): string {
  const summary: IWorkoutPostSummary = {
    version: 3,
    dayName: "Legs",
    startedAt: start,
    durationMs,
    volume: { value: 0, unit: "kg" },
    sets: 2,
    topSets: [],
    prs: [],
    songs: [],
  };
  return WorkoutPost_statsLine(summary).split(" · ")[0];
}

const postCases: [string, number, string][] = [
  ["59 seconds", 59 * 1000, "1 min"],
  ["exactly 60 minutes", 60 * minute, "1 h 0 min"],
  ["zero", 0, "0 min"],
  ["negative, rounds toward zero", -90 * 1000, "-1 min"],
  ["negative two hours", -2 * hour, "-120 min"],
  ["90 minutes", 90 * minute, "1 h 30 min"],
  ["over 24 hours", 25 * hour + 5 * minute, "25 h 5 min"],
];

const journalCases: [string, number, string][] = [
  ["59 seconds", 59 * 1000, "1 min"],
  ["exactly 60 minutes", 60 * minute, "1 h 0 min"],
  ["zero", 0, "0 min"],
  ["negative, clamped to zero", -90 * 1000, "0 min"],
  ["negative two hours, clamped to zero", -2 * hour, "0 min"],
  ["90 minutes", 90 * minute, "1 h 30 min"],
  ["over 24 hours", 25 * hour + 5 * minute, "25 h 5 min"],
];

describe("DurationText_fromMs", () => {
  for (const [name, ms, expected] of postCases) {
    it(`keeps the feed text: ${name}`, () => {
      expect(DurationText_fromMs(ms)).to.equal(expected);
    });
  }
  for (const [name, ms, expected] of journalCases) {
    it(`keeps the journal text: ${name}`, () => {
      expect(DurationText_fromMs(ms, { clampAtZero: true })).to.equal(expected);
    });
  }
});

describe("duration text in the feed post", () => {
  for (const [name, ms, expected] of postCases) {
    it(name, () => {
      expect(postStats(ms)).to.equal(expected);
    });
  }
});

describe("duration text in the journal chip", () => {
  for (const [name, ms, expected] of journalCases) {
    it(name, () => {
      expect(journalChip(ms)).to.equal(expected);
    });
  }
});
