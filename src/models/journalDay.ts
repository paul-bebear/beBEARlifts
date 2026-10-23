import { IHistoryRecord, ISettings, IStatsWeightValue, IWeight } from "../types";
import { IPersonalRecords } from "./history";
import {
  FoodLog_dayKey,
  FoodLog_dayLabel,
  FoodLog_dayTotals,
  FoodLog_entriesFor,
  IFoodLog,
  INutrients,
} from "./foodLog";
import { IMusicLog, MusicLog_sessionForWorkout } from "./musicLog";
import { MusicSession_keptTracks } from "./musicSession";
import { INote, INotesLog, Notes_checkIn, Notes_checkInScales, Notes_forDay, Notes_isBlank } from "./notes";
import { WorkoutPost_build, WorkoutPost_statsLine } from "./workoutPost";

export interface IJournalDayInput {
  day: string;
  today: string;
  history: IHistoryRecord[];
  settings: ISettings;
  prs: IPersonalRecords;
  food: IFoodLog;
  music: IMusicLog;
  weights: IStatsWeightValue[];
  notes: INotesLog;
  isOngoingProgress: boolean;
}

export interface IJournalWorkout {
  id: number;
  dayName: string;
  statsLine: string;
  prs: string[];
  chip: string;
}

export type IJournalPlan = { kind: "start"; label: string } | { kind: "rest" };

export interface IJournalSong {
  id: string;
  name: string;
  artists: string;
}

export interface IJournalDay {
  day: string;
  title: string;
  isToday: boolean;
  workouts: IJournalWorkout[];
  plan?: IJournalPlan;
  mealCount: number;
  totals: INutrients;
  songs: IJournalSong[];
  weight?: IWeight;
  checkIn?: INote;
  notes: INote[];
  chips: string[];
  mindfulness: string;
}

export type IJournalSection = "checkIn" | "workouts" | "meals" | "songs" | "weight" | "notes";

export function JournalDay_sectionSummary(day: IJournalDay, section: IJournalSection): string | undefined {
  switch (section) {
    case "checkIn": {
      const checkIn = day.checkIn;
      if (checkIn == null || Notes_isBlank(checkIn)) {
        return undefined;
      }
      const scores = Notes_checkInScales.filter(({ field }) => checkIn[field] != null).map(
        ({ field, label }) => `${label} ${checkIn[field]}`
      );
      return ["Check-in", ...scores, ...(scores.length === 0 ? ["Reflection logged"] : [])].join(" · ");
    }
    case "workouts":
      return day.workouts.length > 0 ? ["Workout", ...day.workouts.map((w) => w.chip)].join(" · ") : undefined;
    case "meals":
      return day.mealCount > 0
        ? `Meals · ${day.mealCount} logged · ${Math.round(day.totals.calories).toLocaleString("en-US")} kcal`
        : undefined;
    case "songs":
      return day.songs.length > 0 ? `Songs · ${day.songs.length} logged` : undefined;
    case "weight":
      return day.weight != null ? `Weigh-in · ${day.weight.value} ${day.weight.unit}` : undefined;
    case "notes":
      return day.notes.length > 0 ? `Notes · ${day.notes.length} logged` : undefined;
  }
}

// A check-in with one or two faces picked is still being filled in, so it stays open.
function isSectionDone(day: IJournalDay, section: IJournalSection): boolean {
  const checkIn = day.checkIn;
  if (section !== "checkIn" || checkIn == null) {
    return true;
  }
  const picked = Notes_checkInScales.filter(({ field }) => checkIn[field] != null).length;
  return picked === 0 || picked === Notes_checkInScales.length;
}

// isOpenByUser is undefined until the user taps the summary or Hide; after that their choice stands.
export function JournalDay_sectionFold(
  day: IJournalDay,
  section: IJournalSection,
  isOpenByUser: boolean | undefined
): {
  summary?: string;
  isCollapsed: boolean;
  canHide: boolean;
} {
  const summary = JournalDay_sectionSummary(day, section);
  const isOpen = isOpenByUser ?? !isSectionDone(day, section);
  const isCollapsed = summary != null && !isOpen;
  return { summary, isCollapsed, canHide: summary != null && !isCollapsed };
}

// One line a day, in the bear's voice. Each is a thing to do in under five minutes, never a quote.
export const JournalDay_mindfulnessLines = [
  "Breathe in for 4 seconds, out for 6. Do it three times.",
  "Drink a full glass of water before your next meal.",
  "Name one thing your body did well today.",
  "Muscle grows while you sleep. Aim for 8 hours tonight.",
  "Put the phone down for 5 minutes and stretch your back.",
  "Eat one meal today with no screen in front of you.",
  "Walk outside for 10 minutes. Look at the sky once.",
  "Write down one small win from today.",
  "Roll your shoulders back 10 times. Sit up tall.",
  "Text a friend who makes you laugh.",
  "Rest days build muscle too. Be proud of them.",
  "Slow down your next bite. Taste it.",
  "Close your eyes for 30 seconds. Listen to what you hear.",
  "Compare yourself to last month's you, nobody else.",
];

function dayNumber(day: string): number {
  const [year, month, date] = day.split("-").map(Number);
  return Math.round(Date.UTC(year, month - 1, date) / 86400000);
}

export function JournalDay_mindfulness(day: string): string {
  const lines = JournalDay_mindfulnessLines;
  return lines[((dayNumber(day) % lines.length) + lines.length) % lines.length];
}

function dayOf(timestamp: number): string {
  return FoodLog_dayKey(new Date(timestamp));
}

function minutesText(ms: number): string {
  const minutes = Math.max(0, Math.round(ms / 60000));
  return minutes >= 60 ? `${Math.floor(minutes / 60)} h ${minutes % 60} min` : `${minutes} min`;
}

function workoutOf(record: IHistoryRecord, input: IJournalDayInput): IJournalWorkout {
  const summary = WorkoutPost_build(record, input.settings, input.prs, undefined);
  const dayName = summary.dayName.trim() === "" ? "Workout" : summary.dayName.trim();
  return {
    id: record.id,
    dayName,
    statsLine: WorkoutPost_statsLine(summary),
    prs: summary.prs.map((p) => `${p.name} ${p.weight.value} ${p.weight.unit} × ${p.reps}`),
    chip: `${dayName} · ${minutesText(summary.durationMs)}`,
  };
}

function songsOf(records: IHistoryRecord[], music: IMusicLog): IJournalSong[] {
  const songs: IJournalSong[] = [];
  for (const record of records) {
    const session = MusicLog_sessionForWorkout(music, record);
    for (const track of session != null ? MusicSession_keptTracks(session) : []) {
      if (!songs.some((s) => s.id === track.id)) {
        songs.push({ id: track.id, name: track.name, artists: track.artists });
      }
    }
  }
  return songs;
}

function weightOf(weights: IStatsWeightValue[], day: string): IWeight | undefined {
  const sameDay = weights.filter((w) => dayOf(w.timestamp) === day);
  const latest = sameDay.reduce<IStatsWeightValue | undefined>(
    (best, w) => (best == null || w.timestamp > best.timestamp ? w : best),
    undefined
  );
  return latest?.value;
}

function planOf(input: IJournalDayInput, hasWorkout: boolean): IJournalPlan | undefined {
  if (hasWorkout) {
    return undefined;
  }
  if (input.day !== input.today) {
    return { kind: "rest" };
  }
  return { kind: "start", label: input.isOngoingProgress ? "Resume workout" : "Start workout" };
}

function mealsChip(count: number): string | undefined {
  return count === 0 ? undefined : `${count} ${count === 1 ? "food" : "foods"} logged`;
}

export function JournalDay_build(input: IJournalDayInput): IJournalDay {
  const { day, today } = input;
  const records = input.history
    .filter((r) => r.endTime != null && dayOf(r.startTime) === day)
    .sort((a, b) => a.startTime - b.startTime);
  const workouts = records.map((r) => workoutOf(r, input));
  const mealCount = FoodLog_entriesFor(input.food, day).length;
  const chips = [...workouts.map((w) => w.chip), mealsChip(mealCount)].filter((c): c is string => c != null);
  return {
    day,
    title: FoodLog_dayLabel(day, today),
    isToday: day === today,
    workouts,
    plan: planOf(input, workouts.length > 0),
    mealCount,
    totals: FoodLog_dayTotals(input.food, day),
    songs: songsOf(records, input.music),
    weight: weightOf(input.weights, day),
    checkIn: Notes_checkIn(input.notes, day),
    notes: Notes_forDay(input.notes, day),
    chips,
    mindfulness: JournalDay_mindfulness(day),
  };
}
