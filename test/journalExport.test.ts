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
} from "../src/models/journalExport";
import { IHistoryRecord, ISet } from "../src/types";

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
