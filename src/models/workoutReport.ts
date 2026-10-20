import { IHistoryEntry, IHistoryRecord, ISettings, IUnit } from "../types";
import { Exercise_get } from "./exercise";
import { Weight_convertTo } from "./weight";
import { EffortRating_fromRpe, IEffort } from "./effortRating";

export type IReportItemKind = "heavier" | "lighter" | "fewerReps" | "missed" | "tooHard" | "tooEasy" | "followUp";
export type IReportAnswer = "onPurpose" | "feltOff" | "hurt" | "mistake" | "better" | "same" | "worse";

export interface IReportItem {
  key: string;
  exerciseKey: string;
  exerciseName: string;
  kind: IReportItemKind;
  text: string;
  asks: boolean;
}

export interface IWorkoutReport {
  workoutId: number;
  timestamp: number;
  dayName: string;
  items: IReportItem[];
  answers: Partial<Record<string, IReportAnswer>>;
  summary?: string;
}

export interface IReportLog {
  version: 1;
  reports: IWorkoutReport[];
}

interface IExerciseSession {
  top: number;
  reps: number;
  efforts: IEffort[];
  missedSets: number;
}

const windowMs = 28 * 24 * 3600 * 1000;
const maxPastSessions = 4;
const maxReports = 200;

export const WorkoutReport_answerLabels: Record<IReportAnswer, string> = {
  onPurpose: "On purpose",
  feltOff: "Felt off",
  hurt: "Hurt",
  mistake: "Mistake",
  better: "Better",
  same: "Same",
  worse: "Worse",
};

export function WorkoutReport_options(item: IReportItem): IReportAnswer[] {
  if (!item.asks) {
    return [];
  }
  return item.kind === "followUp" ? ["better", "same", "worse"] : ["onPurpose", "feltOff", "hurt", "mistake"];
}

function exerciseKey(entry: IHistoryEntry): string {
  return `${entry.exercise.id}_${entry.exercise.equipment ?? ""}`;
}

function round(value: number): number {
  return Math.round(value * 2) / 2;
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function sessionOf(entry: IHistoryEntry, unit: IUnit): IExerciseSession | undefined {
  const done = entry.sets.filter((s) => s.isCompleted);
  if (done.length === 0) {
    return undefined;
  }
  const weights = done.map((s) => (s.completedWeight != null ? Weight_convertTo(s.completedWeight, unit).value : 0));
  const efforts = done.map((s) => EffortRating_fromRpe(s.completedRpe)).filter((e): e is IEffort => e != null);
  const missedSets = done.filter((s) => {
    const target = s.minReps ?? s.reps;
    return target != null && (s.completedReps ?? 0) < target;
  }).length;
  return {
    top: Math.max(...weights),
    reps: done.reduce((sum, s) => sum + (s.completedReps ?? 0), 0),
    efforts,
    missedSets,
  };
}

function pastSessions(record: IHistoryRecord, history: IHistoryRecord[], key: string, unit: IUnit): IExerciseSession[] {
  return history
    .filter((h) => h.id !== record.id && h.startTime < record.startTime && h.startTime >= record.startTime - windowMs)
    .sort((a, b) => b.startTime - a.startTime)
    .flatMap((h) => h.entries.filter((e) => exerciseKey(e) === key).map((e) => sessionOf(e, unit)))
    .filter((s): s is IExerciseSession => s != null)
    .slice(0, maxPastSessions);
}

function makeItem(key: string, name: string, kind: IReportItemKind, text: string, asks: boolean): IReportItem {
  return { key: `${key}:${kind}`, exerciseKey: key, exerciseName: name, kind, text, asks };
}

function weightItems(
  key: string,
  name: string,
  today: IExerciseSession,
  past: IExerciseSession[],
  unit: IUnit
): IReportItem[] {
  if (past.length === 0 || today.top <= 0) {
    return [];
  }
  const usual = median(past.map((p) => p.top));
  const diff = round(today.top - usual);
  if (today.top <= usual * 0.9 && Math.abs(diff) >= 2) {
    const text = `${name}: ${round(today.top)} ${unit}, ${Math.abs(diff)} ${unit} under your usual ${round(usual)} ${unit}.`;
    return [makeItem(key, name, "lighter", text, true)];
  }
  if (today.top >= usual * 1.025 && diff >= 1) {
    return [
      makeItem(key, name, "heavier", `${name}: ${round(today.top)} ${unit}, up ${diff} ${unit} on your usual.`, false),
    ];
  }
  const last = past[0];
  if (Math.abs(today.top - last.top) <= last.top * 0.025 && today.reps < last.reps * 0.8) {
    const text = `${name}: ${today.reps} reps in total, down from ${last.reps} last time at about the same weight.`;
    return [makeItem(key, name, "fewerReps", text, true)];
  }
  return [];
}

function effortItems(key: string, name: string, today: IExerciseSession, asked: boolean): IReportItem[] {
  if (today.missedSets > 0 && !asked) {
    const sets = today.missedSets === 1 ? "1 set" : `${today.missedSets} sets`;
    return [makeItem(key, name, "missed", `${name}: missed the minimum reps on ${sets}.`, true)];
  }
  const rated = today.efforts;
  if (rated.length === 0) {
    return [];
  }
  const hard = rated.filter((e) => e === "hard").length;
  if (hard * 2 >= rated.length) {
    const text = `${name}: too hard on ${hard} of ${rated.length} sets. Keep the weight next time.`;
    return [makeItem(key, name, "tooHard", text, false)];
  }
  if (rated.every((e) => e === "easy")) {
    return [makeItem(key, name, "tooEasy", `${name}: too easy on every set. Add weight next time.`, false)];
  }
  return [];
}

function followUps(record: IHistoryRecord, previous: IWorkoutReport | undefined): IReportItem[] {
  if (previous == null) {
    return [];
  }
  const today = new Set(record.entries.map(exerciseKey));
  return previous.items.flatMap((it) => {
    const answer = previous.answers[it.key];
    if ((answer !== "hurt" && answer !== "feltOff") || !today.has(it.exerciseKey)) {
      return [];
    }
    const feeling = answer === "hurt" ? "hurt" : "felt off";
    const text = `Last time you said ${it.exerciseName} ${feeling}. How was it today?`;
    return [makeItem(it.exerciseKey, it.exerciseName, "followUp", text, true)];
  });
}

export function WorkoutReport_build(
  record: IHistoryRecord,
  history: IHistoryRecord[],
  previous: IWorkoutReport | undefined,
  settings: ISettings
): IWorkoutReport {
  const unit = settings.units;
  const items: IReportItem[] = [...followUps(record, previous)];
  const seen = new Set<string>();
  for (const entry of record.entries) {
    const key = exerciseKey(entry);
    const today = sessionOf(entry, unit);
    if (today == null || seen.has(key)) {
      continue;
    }
    seen.add(key);
    const name = Exercise_get(entry.exercise, settings.exercises).name;
    const fromWeight = weightItems(key, name, today, pastSessions(record, history, key, unit), unit);
    items.push(
      ...fromWeight,
      ...effortItems(
        key,
        name,
        today,
        fromWeight.some((i) => i.asks)
      )
    );
  }
  return { workoutId: record.id, timestamp: record.startTime, dayName: record.dayName, items, answers: {} };
}

export function WorkoutReport_answer(report: IWorkoutReport, key: string, answer: IReportAnswer): IWorkoutReport {
  return { ...report, answers: { ...report.answers, [key]: answer } };
}

// The lines the AI turns into a summary. Answers are the user's own words for what happened.
export function WorkoutReport_facts(report: IWorkoutReport): string[] {
  return report.items.map((it) => {
    const answer = report.answers[it.key];
    return answer != null ? `${it.text} The user answered: ${WorkoutReport_answerLabels[answer]}.` : it.text;
  });
}

export function WorkoutReport_empty(): IReportLog {
  return { version: 1, reports: [] };
}

export function WorkoutReport_find(log: IReportLog, workoutId: number): IWorkoutReport | undefined {
  return log.reports.find((r) => r.workoutId === workoutId);
}

export function WorkoutReport_previous(log: IReportLog, timestamp: number): IWorkoutReport | undefined {
  return log.reports.filter((r) => r.timestamp < timestamp).sort((a, b) => b.timestamp - a.timestamp)[0];
}

export function WorkoutReport_put(log: IReportLog, report: IWorkoutReport): IReportLog {
  const others = log.reports.filter((r) => r.workoutId !== report.workoutId);
  return { ...log, reports: [report, ...others].sort((a, b) => b.timestamp - a.timestamp).slice(0, maxReports) };
}

const kinds: IReportItemKind[] = ["heavier", "lighter", "fewerReps", "missed", "tooHard", "tooEasy", "followUp"];
const answers = Object.keys(WorkoutReport_answerLabels) as IReportAnswer[];

function parseReport(raw: unknown): IWorkoutReport | undefined {
  const r = (raw ?? {}) as Record<string, unknown>;
  if (typeof r.workoutId !== "number" || typeof r.timestamp !== "number" || !Array.isArray(r.items)) {
    return undefined;
  }
  const items = r.items.filter((i): i is IReportItem => {
    const x = (i ?? {}) as Record<string, unknown>;
    return (
      typeof x.key === "string" &&
      typeof x.exerciseKey === "string" &&
      typeof x.exerciseName === "string" &&
      typeof x.text === "string" &&
      typeof x.asks === "boolean" &&
      kinds.includes(x.kind as IReportItemKind)
    );
  });
  const rawAnswers = (r.answers ?? {}) as Record<string, unknown>;
  const parsedAnswers: Partial<Record<string, IReportAnswer>> = {};
  for (const [key, value] of Object.entries(rawAnswers)) {
    if (answers.includes(value as IReportAnswer)) {
      parsedAnswers[key] = value as IReportAnswer;
    }
  }
  const report: IWorkoutReport = {
    workoutId: r.workoutId,
    timestamp: r.timestamp,
    dayName: typeof r.dayName === "string" ? r.dayName : "",
    items,
    answers: parsedAnswers,
  };
  if (typeof r.summary === "string") {
    report.summary = r.summary;
  }
  return report;
}

export function WorkoutReport_parseLog(raw: unknown): IReportLog {
  const r = (raw ?? {}) as Record<string, unknown>;
  const reports = Array.isArray(r.reports)
    ? r.reports.map(parseReport).filter((x): x is IWorkoutReport => x != null)
    : [];
  return { version: 1, reports };
}

export interface IReportWeek {
  weekStart: number;
  workouts: number;
  heavier: number;
  lighter: number;
  tooHard: number;
  tooEasy: number;
  hurt: number;
}

function weekStartOf(timestamp: number, startsMonday: boolean): number {
  const d = new Date(timestamp);
  d.setHours(0, 0, 0, 0);
  const shift = startsMonday ? (d.getDay() + 6) % 7 : d.getDay();
  d.setDate(d.getDate() - shift);
  return d.getTime();
}

export function WorkoutReport_weeks(log: IReportLog, startsMonday: boolean): IReportWeek[] {
  const weeks = new Map<number, IReportWeek>();
  for (const report of log.reports) {
    const weekStart = weekStartOf(report.timestamp, startsMonday);
    const week = weeks.get(weekStart) ?? {
      weekStart,
      workouts: 0,
      heavier: 0,
      lighter: 0,
      tooHard: 0,
      tooEasy: 0,
      hurt: 0,
    };
    week.workouts += 1;
    for (const it of report.items) {
      if (it.kind === "heavier" || it.kind === "lighter" || it.kind === "tooHard" || it.kind === "tooEasy") {
        week[it.kind] += 1;
      }
      if (report.answers[it.key] === "hurt" || report.answers[it.key] === "worse") {
        week.hurt += 1;
      }
    }
    weeks.set(weekStart, week);
  }
  return Array.from(weeks.values()).sort((a, b) => b.weekStart - a.weekStart);
}

export function WorkoutReport_weekLine(week: IReportWeek): string {
  const counts: [number, string][] = [
    [week.heavier, "heavier"],
    [week.lighter, "lighter"],
    [week.tooHard, "too hard"],
    [week.tooEasy, "too easy"],
    [week.hurt, "hurt or worse"],
  ];
  const parts = [`${week.workouts} workout${week.workouts === 1 ? "" : "s"}`];
  return [...parts, ...counts.filter(([n]) => n > 0).map(([n, label]) => `${n} ${label}`)].join(" · ");
}
