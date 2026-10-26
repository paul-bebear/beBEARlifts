import { IHistoryRecord, ISet, ISettings } from "../types";
import { Exercise_get } from "./exercise";
import { Weight_convertTo } from "./weight";
import {
  IScheduleProgram,
  IWeekScheduleLog,
  WeekSchedule_dayCount,
  WeekSchedule_dayName,
  WeekSchedule_forProgram,
  WeekSchedule_startChoice,
  WeekSchedule_today,
  WeekSchedule_todayFor,
} from "./weekSchedule";

export type IGymBagItemId = "water" | "belt" | "straps" | "shoes";

export interface IGymBagItem {
  id: IGymBagItemId;
  label: string;
}

export interface IGymBagCheckDay {
  name: string;
  record?: IHistoryRecord;
  isRest: boolean;
  nextWeekday?: string;
}

export interface IGymBagCheck {
  title: string;
  items: IGymBagItem[];
  button: string;
  isRest: boolean;
}

export interface IGymBagPlan {
  kind: "today" | "next" | "rest";
  day: number;
  name: string;
  nextWeekday?: string;
}

const dayMs = 86400000;
const minutesPerSet = 2.5;
const beltShare = 0.8;
const weekdays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const labels: Record<IGymBagItemId, string> = {
  water: "Water bottle",
  belt: "Lifting belt",
  straps: "Lifting straps",
  shoes: "Running shoes",
};

function exerciseName(type: IHistoryRecord["entries"][number]["exercise"], settings: ISettings): string {
  return Exercise_get(type, settings.exercises).name;
}

function kg(set: ISet, completed: boolean): number {
  const weight = completed ? (set.completedWeight ?? set.weight) : set.weight;
  return weight == null ? 0 : Weight_convertTo(weight, "kg").value;
}

function best(history: readonly IHistoryRecord[], exerciseId: string): number {
  let max = 0;
  for (const record of history) {
    for (const entry of record.entries) {
      if (entry.exercise.id !== exerciseId) {
        continue;
      }
      for (const set of entry.sets) {
        if ((set.completedReps ?? 0) > 0) {
          max = Math.max(max, kg(set, true));
        }
      }
    }
  }
  return max;
}

function needsBelt(record: IHistoryRecord, history: readonly IHistoryRecord[], settings: ISettings): boolean {
  return record.entries.some((entry) => {
    if (!/squat|deadlift/i.test(exerciseName(entry.exercise, settings))) {
      return false;
    }
    const top = Math.max(0, ...entry.sets.map((set) => kg(set, false)));
    const heaviest = best(history, entry.exercise.id);
    return heaviest > 0 && top >= beltShare * heaviest;
  });
}

function minutes(record: IHistoryRecord): number {
  const sets = record.entries.reduce((sum, entry) => sum + entry.sets.length, 0);
  return Math.max(5, Math.round((sets * minutesPerSet) / 5) * 5);
}

// Water always. A belt for a heavy squat or deadlift, straps for a row or a deadlift, shoes for a run.
export function GymBagCheck_items(
  day: IGymBagCheckDay,
  history: readonly IHistoryRecord[],
  settings: ISettings
): IGymBagCheck {
  const record = day.record;
  const names = record == null ? [] : record.entries.map((entry) => exerciseName(entry.exercise, settings));
  const ids: IGymBagItemId[] = ["water"];
  if (record != null && needsBelt(record, history, settings)) {
    ids.push("belt");
  }
  if (names.some((name) => /row|deadlift/i.test(name))) {
    ids.push("straps");
  }
  if (names.some((name) => /\brun|jog|treadmill/i.test(name))) {
    ids.push("shoes");
  }
  const name = day.name.trim() === "" ? "Workout" : day.name.trim();
  const count = record?.entries.length ?? 0;
  const title = day.isRest
    ? `Rest day · next: ${name}${day.nextWeekday != null ? ` on ${day.nextWeekday}` : ""}`
    : record == null || count === 0
      ? name
      : `${name} · ${count} ${count === 1 ? "exercise" : "exercises"} · about ${minutes(record)} min`;
  return {
    title,
    items: ids.map((id) => ({ id, label: labels[id] })),
    button: day.isRest ? "Train anyway" : "Let's go",
    isRest: day.isRest,
  };
}

function nextWeekday(
  program: IScheduleProgram & { id: string },
  log: IWeekScheduleLog,
  now: number
): string | undefined {
  const slots = WeekSchedule_forProgram(log, program.id, WeekSchedule_dayCount(program));
  for (let offset = 1; offset <= 7; offset += 1) {
    const at = now + offset * dayMs;
    const today = WeekSchedule_today(program, slots, at);
    if (today.kind === "day" && today.day === program.nextDay) {
      return weekdays[new Date(at).getDay()];
    }
  }
  return undefined;
}

// The day the door starts. It is today's planned day when the week says so, the next day in order otherwise.
export function GymBagCheck_plan(
  program: IScheduleProgram & { id: string },
  log: IWeekScheduleLog,
  opts: { now: number; workedOutToday: boolean; hasProgress: boolean }
): IGymBagPlan {
  const choice = WeekSchedule_startChoice(program, WeekSchedule_todayFor(log, program, opts.now), opts);
  switch (choice.kind) {
    case "today":
      return { kind: "today", day: choice.day, name: choice.todayName };
    case "rest":
      return {
        kind: "rest",
        day: program.nextDay,
        name: choice.nextName,
        nextWeekday: nextWeekday(program, log, opts.now),
      };
    case "next":
      return { kind: "next", day: program.nextDay, name: WeekSchedule_dayName(program, program.nextDay) };
  }
}
