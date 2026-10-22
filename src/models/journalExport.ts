import {
  FoodLog_dayKey,
  FoodLog_entriesFor,
  FoodLog_formatNumber,
  FoodLog_mealNames,
  FoodLog_meals,
  IFoodLog,
} from "./foodLog";
import { IJournalDay, IJournalDayInput, JournalDay_build } from "./journalDay";
import { Notes_days, Notes_scoresLine, Notes_toMarkdown } from "./notes";
import { WorkoutPost_build } from "./workoutPost";

export type IJournalExportSources = Omit<IJournalDayInput, "day">;
export type IJournalExportRange = "today" | "week" | "all";
export type IJournalExportFormat = "markdown" | "csv";

export const JournalExport_ranges: { value: IJournalExportRange; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "week", label: "Last 7 days" },
  { value: "all", label: "All days" },
];
export const JournalExport_formats: { value: IJournalExportFormat; label: string }[] = [
  { value: "markdown", label: "Markdown" },
  { value: "csv", label: "CSV" },
];

export function JournalExport_rangeDays(sources: IJournalExportSources, range: IJournalExportRange): string[] {
  if (range === "today") {
    return [sources.today];
  }
  const [year, month, date] = sources.today.split("-").map(Number);
  const start = FoodLog_dayKey(new Date(year, month - 1, date - 6, 12));
  return JournalExport_days(sources).filter((day) => range === "all" || day >= start);
}

const csvColumns = [
  "date",
  "kind",
  "title",
  "text",
  "calories",
  "protein_g",
  "carbs_g",
  "fat_g",
  "weight",
  "unit",
  "energy",
  "soreness",
  "mood",
  "duration_minutes",
  "volume",
  "sets",
  "artists",
  "duration_seconds",
] as const;
type ICsvRow = Partial<Record<(typeof csvColumns)[number], string | number>>;

function csvCell(value: string | number | undefined): string {
  const text = String(value ?? "");
  const safe = /^[=+@\-\t\r]/.test(text) && typeof value === "string" ? `'${text}` : text;
  return /[",\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

function csvRows(sources: IJournalExportSources, day: string): ICsvRow[] {
  const journal = JournalDay_build({ ...sources, day });
  const rows: ICsvRow[] = [];
  for (const record of sources.history) {
    if (record.endTime == null || FoodLog_dayKey(new Date(record.startTime)) !== day) {
      continue;
    }
    const workout = WorkoutPost_build(record, sources.settings, sources.prs, undefined);
    rows.push({
      date: day,
      kind: "workout",
      title: workout.dayName.trim() || "Workout",
      duration_minutes: workout.durationMs / 60000,
      volume: workout.volume.value,
      unit: workout.volume.unit,
      sets: workout.sets,
    });
  }
  for (const entry of FoodLog_entriesFor(sources.food, day)) {
    const n = entry.nutrients;
    rows.push({
      date: day,
      kind: "meal",
      title: entry.name,
      calories: n.calories,
      protein_g: n.protein,
      carbs_g: n.carbs,
      fat_g: n.fat,
    });
  }
  for (const weight of sources.weights.filter((w) => FoodLog_dayKey(new Date(w.timestamp)) === day)) {
    rows.push({ date: day, kind: "weigh-in", title: "Weigh-in", weight: weight.value.value, unit: weight.value.unit });
  }
  for (const note of sources.notes.notes.filter((n) => n.day === day)) {
    rows.push({
      date: day,
      kind: note.kind === "checkIn" ? "check-in" : "note",
      title: note.title,
      text: note.body,
      energy: note.energy,
      soreness: note.soreness,
      mood: note.mood,
    });
  }
  for (const song of journal.songs) {
    const play = sources.music.sessions.flatMap((session) => session.plays).find((p) => p.track.id === song.id);
    rows.push({
      date: day,
      kind: "song",
      title: song.name,
      artists: song.artists,
      duration_seconds: play != null ? play.track.durationMs / 1000 : undefined,
    });
  }
  return rows;
}

export function JournalExport_csv(sources: IJournalExportSources, range: IJournalExportRange): string {
  const rows = JournalExport_rangeDays(sources, range).flatMap((day) => csvRows(sources, day));
  return `\uFEFF${[csvColumns.join(","), ...rows.map((row) => csvColumns.map((c) => csvCell(row[c])).join(","))].join("\r\n")}\r\n`;
}

export type IJournalExportOutput =
  | { kind: "file"; filename: string; text: string }
  | { kind: "zip"; filename: string; files: Record<string, string> };

export function JournalExport_output(
  sources: IJournalExportSources,
  range: IJournalExportRange,
  format: IJournalExportFormat
): IJournalExportOutput {
  const filename = `bebear-journal-${sources.today}`;
  if (format === "csv") {
    return { kind: "file", filename: `${filename}.csv`, text: JournalExport_csv(sources, range) };
  }
  const days = JournalExport_rangeDays(sources, range);
  if (days.length <= 1) {
    const day = days[0] ?? sources.today;
    return { kind: "file", filename: `${day}.md`, text: JournalExport_day(sources, day).text };
  }
  const files: Record<string, string> = {};
  for (const day of days) {
    const file = JournalExport_day(sources, day);
    files[file.path] = file.text;
  }
  return { kind: "zip", filename: `${filename}.zip`, files };
}

const weekdays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const months = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export function JournalExport_dateTitle(day: string): string {
  const [year, month, date] = day.split("-").map(Number);
  const weekday = weekdays[new Date(year, month - 1, date, 12).getDay()];
  return `${weekday}, ${months[month - 1]} ${date}, ${year}`;
}

function JournalExport_path(day: string): string {
  return `journal/${day}.md`;
}

function grouped(n: number): string {
  return Math.round(n).toLocaleString("en-US");
}

function section(title: string, lines: string[]): string[] {
  return lines.length === 0 ? [] : ["", `## ${title}`, "", ...lines];
}

function mealLines(day: string, food: IFoodLog): string[] {
  const lines: string[] = [];
  for (const meal of FoodLog_meals) {
    for (const entry of FoodLog_entriesFor(food, day, meal)) {
      const n = entry.nutrients;
      lines.push(
        `- ${FoodLog_mealNames[meal]}: ${entry.name} (${grouped(n.calories)} kcal, ${FoodLog_formatNumber(n.protein)} g protein)`
      );
    }
  }
  return lines;
}

function JournalExport_dayMarkdown(journal: IJournalDay, food: IFoodLog): string {
  const { checkIn, totals } = journal;
  const scores = checkIn != null ? Notes_scoresLine(checkIn) : "";
  const reflection = checkIn?.body.trim() ?? "";
  const meals = mealLines(journal.day, food);
  const lines = [
    `# ${JournalExport_dateTitle(journal.day)}`,
    ...(scores !== "" ? ["", scores] : []),
    ...(reflection !== "" ? ["", ...reflection.split("\n").map((l) => `> ${l}`)] : []),
    ...section(
      "Workout",
      journal.workouts.flatMap((w) => [`- ${w.dayName} · ${w.statsLine}`, ...w.prs.map((pr) => `  - PR: ${pr}`)])
    ),
    ...section(
      "Meals",
      meals.length === 0
        ? []
        : [
            ...meals,
            "",
            `Total: ${grouped(totals.calories)} kcal · C ${FoodLog_formatNumber(totals.carbs)} g · P ${FoodLog_formatNumber(totals.protein)} g · F ${FoodLog_formatNumber(totals.fat)} g`,
          ]
    ),
    ...section(
      "Songs",
      journal.songs.map((s) => (s.artists === "" ? `- ${s.name}` : `- ${s.name} — ${s.artists}`))
    ),
    ...section("Weigh-in", journal.weight != null ? [`${journal.weight.value} ${journal.weight.unit}`] : []),
    ...section(
      "Notes",
      [...journal.notes].reverse().flatMap((n, i) => [...(i > 0 ? [""] : []), Notes_toMarkdown(n)])
    ),
  ];
  return `${lines.join("\n")}\n`;
}

export function JournalExport_days(sources: IJournalExportSources): string[] {
  const days = new Set<string>(Notes_days(sources.notes));
  for (const entry of sources.food.entries) {
    days.add(entry.day);
  }
  for (const record of sources.history) {
    if (record.endTime != null) {
      days.add(FoodLog_dayKey(new Date(record.startTime)));
    }
  }
  for (const weight of sources.weights) {
    days.add(FoodLog_dayKey(new Date(weight.timestamp)));
  }
  return Array.from(days)
    .filter((d) => d <= sources.today)
    .sort();
}

export function JournalExport_day(sources: IJournalExportSources, day: string): { path: string; text: string } {
  return {
    path: JournalExport_path(day),
    text: JournalExport_dayMarkdown(JournalDay_build({ ...sources, day }), sources.food),
  };
}

export function JournalExport_files(sources: IJournalExportSources): Record<string, string> {
  const files: Record<string, string> = {};
  for (const day of JournalExport_days(sources)) {
    const { path, text } = JournalExport_day(sources, day);
    files[path] = text;
  }
  return files;
}
