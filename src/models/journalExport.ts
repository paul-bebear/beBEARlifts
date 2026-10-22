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

export type IJournalExportSources = Omit<IJournalDayInput, "day">;

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

export function JournalExport_path(day: string): string {
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

export function JournalExport_dayMarkdown(journal: IJournalDay, food: IFoodLog): string {
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
