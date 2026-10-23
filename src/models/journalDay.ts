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
import {
  INote,
  INotesLog,
  Notes_canEditCheckIn,
  Notes_checkIn,
  Notes_checkInScales,
  Notes_forDay,
  Notes_isBlank,
} from "./notes";
import { WorkoutPost_build, WorkoutPost_statsLine } from "./workoutPost";
import { FeatureLayer_isFront, IFeature } from "./featureLayer";

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
}

export interface IJournalWorkout {
  id: number;
  dayName: string;
  statsLine: string;
  prs: string[];
  chip: string;
}

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
  mealCount: number;
  canAddFood: boolean;
  canEditCheckIn: boolean;
  totals: INutrients;
  songs: IJournalSong[];
  weight?: IWeight;
  checkIn?: INote;
  notes: INote[];
  chips: string[];
}

export type IJournalSection = "checkIn" | "workouts" | "meals" | "songs" | "weight" | "notes";

const sectionFeatures: Record<IJournalSection, IFeature> = {
  checkIn: "checkIn",
  workouts: "workout",
  meals: "food",
  songs: "music",
  weight: "weight",
  notes: "notes",
};

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

export interface IJournalEmptyRow {
  title: string;
  hint: string;
}

export const JournalDay_hints = {
  checkIn: "How are you today?",
  noWorkoutToday: "Tap + to start one",
  restDay: "Rest day",
  noFoodToday: "Tap + to feed the bear",
  nothingLogged: "Nothing logged",
  noWeight: "Not logged",
  noNotes: "None yet",
};

export function JournalDay_emptyRow(day: IJournalDay, section: IJournalSection): IJournalEmptyRow | undefined {
  if (!FeatureLayer_isFront(sectionFeatures[section]) && JournalDay_sectionSummary(day, section) == null) {
    return undefined;
  }
  const hints = JournalDay_hints;
  switch (section) {
    case "checkIn":
      return day.canEditCheckIn && (day.checkIn == null || Notes_isBlank(day.checkIn))
        ? { title: "Check-in", hint: hints.checkIn }
        : undefined;
    case "workouts":
      return day.workouts.length === 0
        ? { title: "Workout", hint: day.isToday ? hints.noWorkoutToday : hints.restDay }
        : undefined;
    case "meals":
      return day.mealCount === 0
        ? { title: "Meals", hint: day.isToday ? hints.noFoodToday : hints.nothingLogged }
        : undefined;
    case "songs":
      return undefined;
    case "weight":
      return day.weight == null ? { title: "Weigh-in", hint: hints.noWeight } : undefined;
    case "notes":
      return day.notes.length === 0 ? { title: "Notes", hint: hints.noNotes } : undefined;
  }
}

export interface IJournalSectionFold {
  isHidden?: boolean;
  summary?: string;
  isCollapsed: boolean;
  canHide: boolean;
  empty?: IJournalEmptyRow;
}

export function JournalDay_sectionFold(
  day: IJournalDay,
  section: IJournalSection,
  isOpenByUser: boolean | undefined
): IJournalSectionFold {
  const summary = JournalDay_sectionSummary(day, section);
  if (!FeatureLayer_isFront(sectionFeatures[section]) && summary == null) {
    return { isHidden: true, isCollapsed: false, canHide: false };
  }
  const empty = JournalDay_emptyRow(day, section);
  if (empty != null && !(section === "checkIn" && isOpenByUser === true)) {
    return { isCollapsed: false, canHide: false, empty };
  }
  const isOpen = isOpenByUser ?? !isSectionDone(day, section);
  const isCollapsed = summary != null && !isOpen;
  return { summary, isCollapsed, canHide: summary != null && !isCollapsed };
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
    mealCount,
    canAddFood: day < today,
    canEditCheckIn: Notes_canEditCheckIn(day, today),
    totals: FoodLog_dayTotals(input.food, day),
    songs: songsOf(records, input.music),
    weight: weightOf(input.weights, day),
    checkIn: Notes_checkIn(input.notes, day),
    notes: Notes_forDay(input.notes, day),
    chips,
  };
}
