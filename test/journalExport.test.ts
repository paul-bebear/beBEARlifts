import "mocha";
import { expect } from "chai";
import { Settings_build } from "../src/models/settings";
import { History_getPersonalRecords } from "../src/models/history";
import { FoodLog_empty, IFoodEntry } from "../src/models/foodLog";
import { MusicLog_empty } from "../src/models/musicLog";
import { Notes_empty, Notes_new, Notes_save, Notes_updateCheckIn } from "../src/models/notes";
import {
  IJournalExportSources,
  JournalExport_dateTitle,
  JournalExport_day,
  JournalExport_days,
  JournalExport_files,
  JournalExport_csv,
  JournalExport_rangeDays,
  JournalExport_output,
} from "../src/models/journalExport";
import { IHistoryRecord, ISet } from "../src/types";
import { parse } from "papaparse";

function at(day: string, hour: number): number {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(y, m - 1, d, hour).getTime();
}

function legs(start: number): IHistoryRecord {
  const set = {
    vtype: "set",
    index: 0,
    reps: 5,
    weight: { value: 100, unit: "kg" },
    completedWeight: { value: 100, unit: "kg" },
    completedReps: 5,
    isCompleted: true,
  } as ISet;
  return {
    vtype: "history_record",
    date: new Date(start).toISOString(),
    programId: "p",
    programName: "beBEAR",
    day: 1,
    dayName: "Legs",
    entries: [
      {
        vtype: "history_entry",
        index: 0,
        id: "squat",
        exercise: { id: "squat", equipment: "barbell" },
        sets: [set],
        warmupSets: [],
      },
    ],
    startTime: start,
    endTime: start + 48 * 60000,
    id: start,
  };
}

function oats(day: string): IFoodEntry {
  return {
    id: `oats-${day}`,
    day,
    meal: "breakfast",
    name: "Oats",
    source: "manual",
    nutrients: { calories: 1420, protein: 18.4, carbs: 60, fat: 8 },
    createdAt: at(day, 8),
  };
}

const today = "2026-10-22";

function sources(extra: Partial<IJournalExportSources> = {}): IJournalExportSources {
  const history = extra.history ?? [];
  return {
    today,
    history,
    settings: { ...Settings_build(), units: "kg" as const },
    prs: History_getPersonalRecords(history),
    food: FoodLog_empty(),
    music: MusicLog_empty(),
    weights: [],
    notes: Notes_empty(),
    isOngoingProgress: false,
    ...extra,
  };
}

describe("JournalExport", () => {
  it("filters the last seven calendar days inclusively and excludes future days", () => {
    const data = sources({
      food: { ...FoodLog_empty(), entries: [oats("2026-10-15"), oats("2026-10-16"), oats(today), oats("2026-10-23")] },
    });
    expect(JournalExport_rangeDays(data, "today")).to.eql([today]);
    expect(JournalExport_rangeDays(data, "week")).to.eql(["2026-10-16", today]);
    expect(JournalExport_rangeDays(data, "all")).to.eql(["2026-10-15", "2026-10-16", today]);
  });

  it("handles month and year boundaries", () => {
    const data = sources({
      today: "2027-01-03",
      food: { ...FoodLog_empty(), entries: [oats("2026-12-27"), oats("2026-12-28"), oats("2027-01-01")] },
    });
    expect(JournalExport_rangeDays(data, "week")).to.eql(["2026-12-28", "2027-01-01"]);
  });

  it("writes one CSV row per logged item, including multiple weigh-ins", () => {
    const start = at(today, 18);
    let notes = Notes_save(
      Notes_empty(),
      { ...Notes_new("n", today, 1), title: 'A, "note"', body: "Line 1\nLine 2" },
      1
    );
    notes = Notes_updateCheckIn(notes, { day: today, newId: "c", now: 2, field: "energy", value: 4 });
    const data = sources({
      history: [legs(start)],
      notes,
      food: { ...FoodLog_empty(), entries: [oats(today)] },
      weights: [70, 71].map((value, i) => ({
        vtype: "stat" as const,
        value: { value, unit: "kg" as const },
        timestamp: at(today, 7 + i),
      })),
      music: {
        ...MusicLog_empty(),
        sessions: [
          {
            id: start,
            startedAt: start,
            plays: [
              {
                track: { id: "s", uri: "spotify:track:s", name: "Song", artists: "Artist", durationMs: 180000 },
                startedAt: start,
                heardMs: 170000,
                source: "live",
                isKept: true,
              },
            ],
          },
        ],
      },
    });
    const parsed = parse<Record<string, string>>(JournalExport_csv(data, "today"), {
      header: true,
      skipEmptyLines: true,
    });
    expect(parsed.errors).to.eql([]);
    expect(parsed.data.map((r) => r.kind)).to.eql([
      "workout",
      "meal",
      "weigh-in",
      "weigh-in",
      "note",
      "check-in",
      "song",
    ]);
    expect(parsed.data[0]).to.include({
      date: today,
      title: "Legs",
      duration_minutes: "48",
      volume: "500",
      sets: "1",
      unit: "kg",
    });
    expect(parsed.data[1]).to.include({ calories: "1420", protein_g: "18.4", carbs_g: "60", fat_g: "8" });
    expect(parsed.data[4]).to.include({ title: 'A, "note"', text: "Line 1\nLine 2" });
    expect(parsed.data[5].energy).to.equal("4");
    expect(parsed.data[6]).to.include({ title: "Song", artists: "Artist", duration_seconds: "180" });
  });

  it("escapes spreadsheet formulas in text while preserving numeric values", () => {
    const notes = Notes_save(Notes_empty(), { ...Notes_new("n", today, 1), title: "=1+1", body: "@SUM(A1)" }, 1);
    const parsed = parse<Record<string, string>>(JournalExport_csv(sources({ notes }), "today"), {
      header: true,
      skipEmptyLines: true,
    });
    expect(parsed.data[0]).to.include({ title: "'=1+1", text: "'@SUM(A1)" });
  });

  it("exports one Markdown file for one day, a zip for multiple days, and one CSV", () => {
    expect(JournalExport_output(sources(), "today", "markdown")).to.include({ kind: "file", filename: `${today}.md` });
    const data = sources({ food: { ...FoodLog_empty(), entries: [oats(today), oats("2026-10-21")] } });
    const output = JournalExport_output(data, "week", "markdown");
    expect(output.kind).to.equal("zip");
    if (output.kind === "zip") {
      expect(Object.keys(output.files)).to.eql(["journal/2026-10-21.md", `journal/${today}.md`]);
    }
    expect(JournalExport_output(data, "week", "csv")).to.include({
      kind: "file",
      filename: `bebear-journal-${today}.csv`,
    });
    expect(JournalExport_csv(sources(), "all").split("\r\n")).to.have.length(2);
  });

  it("titles a day with the full date", () => {
    expect(JournalExport_dateTitle("2026-10-22")).to.equal("Thursday, October 22, 2026");
  });

  it("writes a whole day as Markdown, section by section, notes oldest first", () => {
    let notes = Notes_save(Notes_empty(), { ...Notes_new("a", today, 1), title: "Morning", body: "Slept 8 h" }, 1);
    notes = Notes_save(notes, { ...Notes_new("b", today, 2), title: "", body: "Squat felt [[easy]]" }, 2);
    notes = Notes_updateCheckIn(notes, { day: today, newId: "k", now: 3, field: "energy", value: 4 });
    notes = Notes_updateCheckIn(notes, { day: today, newId: "k", now: 3, field: "mood", value: 5 });
    notes = Notes_updateCheckIn(notes, { day: today, newId: "k", now: 3, reflection: "Good day\nCalm" });
    const file = JournalExport_day(
      sources({
        history: [legs(at(today, 18))],
        food: { ...FoodLog_empty(), entries: [oats(today)] },
        weights: [{ vtype: "stat", value: { value: 70.4, unit: "kg" }, timestamp: at(today, 7) }],
        notes,
      }),
      today
    );
    expect(file.path).to.equal("journal/2026-10-22.md");
    expect(file.text).to.equal(
      [
        "# Thursday, October 22, 2026",
        "",
        "Energy 4/5 · Mood 5/5",
        "",
        "> Good day",
        "> Calm",
        "",
        "## Workout",
        "",
        "- Legs · 48 min · 500 kg · 1 set",
        "",
        "## Meals",
        "",
        "- Breakfast: Oats (1,420 kcal, 18.4 g protein)",
        "",
        "Total: 1,420 kcal · C 60 g · P 18.4 g · F 8 g",
        "",
        "## Weigh-in",
        "",
        "70.4 kg",
        "",
        "## Notes",
        "",
        "### Morning",
        "",
        "Slept 8 h",
        "",
        "### Untitled note",
        "",
        "Squat felt [[easy]]",
        "",
      ].join("\n")
    );
  });

  it("writes only the date for a day with nothing in it", () => {
    expect(JournalExport_day(sources(), today).text).to.equal("# Thursday, October 22, 2026\n");
  });

  it("lists every past day with a note, a meal, a workout or a weigh-in, once each", () => {
    const notes = Notes_save(Notes_empty(), { ...Notes_new("a", "2026-10-03", 1), title: "Hi" }, 1);
    const days = JournalExport_days(
      sources({
        notes,
        food: { ...FoodLog_empty(), entries: [oats("2026-10-05"), oats("2026-10-05"), oats("2026-10-30")] },
        history: [legs(at("2026-10-01", 18)), { ...legs(at("2026-10-02", 18)), endTime: undefined }],
        weights: [{ vtype: "stat", value: { value: 70, unit: "kg" }, timestamp: at("2026-10-04", 7) }],
      })
    );
    expect(days).to.eql(["2026-10-01", "2026-10-03", "2026-10-04", "2026-10-05"]);
  });

  it("writes one file per day under journal/", () => {
    const files = JournalExport_files(
      sources({ food: { ...FoodLog_empty(), entries: [oats("2026-10-05"), oats("2026-10-06")] } })
    );
    expect(Object.keys(files)).to.eql(["journal/2026-10-05.md", "journal/2026-10-06.md"]);
    expect(files["journal/2026-10-06.md"]).to.contain("# Tuesday, October 6, 2026");
  });
});
