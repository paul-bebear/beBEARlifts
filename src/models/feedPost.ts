import { IHistoryEntry, IHistoryRecord, ISet, ISettings, IWeight } from "../types";
import {
  History_getMaxWeightSetFromEntry,
  History_getPersonalRecords,
  History_totalRecordSets,
  History_totalRecordWeight,
  History_workoutTime,
} from "./history";
import { Exercise_fromKey, Exercise_get } from "./exercise";
import { Weight_build, Weight_getOneRepMax } from "./weight";
import { Reps_avgUnilateralCompletedReps } from "./set";
import { FoodLog_meals, FoodLog_sum, IFoodEntry, IFoodMeal, INutrients } from "./foodLog";
import { IMusicSession, MusicSession_keptTracks } from "./musicSession";
import { ObjectUtils_keys } from "../utils/object";

export type IFeedPostKind = "workout" | "meal";
export type IFeedAudience = "friends" | "public";

export interface IFeedWeight {
  value: number;
  unit: "kg" | "lb";
}

export interface IFeedTrack {
  uri: string;
  name: string;
  artists: string;
  imageUrl?: string;
}

export interface IFeedMusic {
  tracks: IFeedTrack[];
  playlistUrl?: string;
}

export interface IFeedExercise {
  name: string;
  sets: number;
  best?: { weight: IFeedWeight; reps: number };
}

export interface IFeedPr {
  exercise: string;
  kind: "weight" | "e1rm";
  weight: IFeedWeight;
  reps: number;
}

export interface IFeedWorkoutPayload {
  v: 1;
  programName: string;
  dayName: string;
  startTime: number;
  durationMs: number;
  volume: IFeedWeight;
  sets: number;
  exercises: IFeedExercise[];
  prs: IFeedPr[];
  music?: IFeedMusic;
}

export interface IFeedMealItem {
  name: string;
  grams?: number;
  calories: number;
}

export interface IFeedMealPayload {
  v: 1;
  day: string;
  meal: IFoodMeal;
  items: IFeedMealItem[];
  totals: INutrients;
}

export type IFeedContent =
  | { kind: "workout"; payload: IFeedWorkoutPayload }
  | { kind: "meal"; payload: IFeedMealPayload };

export type IFeedDraft = IFeedContent & { clientKey: string };

export interface IFeedPost {
  id: string;
  authorId: string;
  username: string;
  createdAt: string;
  audience: IFeedAudience;
  comment?: string;
  content: IFeedContent;
}

export interface IFeedCursor {
  createdAt: string;
  id: string;
}

export interface IFeedPage {
  posts: IFeedPost[];
  next?: IFeedCursor;
}

export const FeedPost_pageSize = 20;
export const FeedPost_maxComment = 500;
const maxExercises = 5;
const maxPrs = 20;
const maxTracks = 50;
const maxMealItems = 30;
const maxText = 100;

const trackUriPattern = /^spotify:track:[A-Za-z0-9]{22}$/;
const playlistUrlPattern = /^https:\/\/open\.spotify\.com\/playlist\/[A-Za-z0-9]{22}$/;
const imageOrigin = "https://i.scdn.co/";
const dayPattern = /^\d{4}-\d{2}-\d{2}$/;

export function FeedPost_workoutKey(recordId: number): string {
  return `workout:${recordId}`;
}

export function FeedPost_mealKey(day: string, meal: IFoodMeal): string {
  return `meal:${day}:${meal}`;
}

export function FeedPost_trackUrl(uri: string): string {
  return `https://open.spotify.com/track/${uri.slice("spotify:track:".length)}`;
}

function clip(text: string): string {
  return text.length > maxText ? text.slice(0, maxText) : text;
}

function feedWeight(weight: IWeight): IFeedWeight {
  return { value: Math.round(weight.value * 10) / 10, unit: weight.unit };
}

function setWeight(set: ISet, settings: ISettings): IWeight {
  return set.completedWeight ?? set.weight ?? Weight_build(0, settings.units);
}

function exerciseName(key: string, settings: ISettings): string {
  return clip(Exercise_get(Exercise_fromKey(key), settings.exercises).name);
}

function feedExercise(entry: IHistoryEntry, settings: ISettings): IFeedExercise {
  const name = clip(Exercise_get(entry.exercise, settings.exercises).name);
  const sets = entry.sets.filter((s) => s.isCompleted).length;
  const best = History_getMaxWeightSetFromEntry(entry);
  return best == null
    ? { name, sets }
    : { name, sets, best: { weight: feedWeight(setWeight(best, settings)), reps: best.completedReps ?? 0 } };
}

function feedPrs(record: IHistoryRecord, history: IHistoryRecord[], settings: ISettings): IFeedPr[] {
  const prs = History_getPersonalRecords(history)[record.id] ?? {};
  const result: IFeedPr[] = [];
  for (const key of ObjectUtils_keys(prs)) {
    const pr = prs[key];
    if (pr?.maxWeightSet != null) {
      const set = pr.maxWeightSet;
      result.push({
        exercise: exerciseName(key, settings),
        kind: "weight",
        weight: feedWeight(setWeight(set, settings)),
        reps: set.completedReps ?? 0,
      });
    }
    if (pr?.max1RMSet != null) {
      const set = pr.max1RMSet;
      const reps = Reps_avgUnilateralCompletedReps(set) ?? 0;
      result.push({
        exercise: exerciseName(key, settings),
        kind: "e1rm",
        weight: feedWeight(Weight_getOneRepMax(setWeight(set, settings), reps, set.completedRpe ?? set.rpe)),
        reps,
      });
    }
  }
  return result.slice(0, maxPrs);
}

export function FeedPost_music(session: IMusicSession | undefined): IFeedMusic | undefined {
  if (session == null) {
    return undefined;
  }
  const tracks: IFeedTrack[] = MusicSession_keptTracks(session)
    .filter((t) => trackUriPattern.test(t.uri))
    .slice(0, maxTracks)
    .map((t) => {
      const track: IFeedTrack = { uri: t.uri, name: clip(t.name), artists: clip(t.artists) };
      if (t.imageUrl != null && t.imageUrl.startsWith(imageOrigin)) {
        track.imageUrl = t.imageUrl;
      }
      return track;
    });
  const playlistUrl =
    session.playlistUrl != null && playlistUrlPattern.test(session.playlistUrl) ? session.playlistUrl : undefined;
  if (tracks.length === 0 && playlistUrl == null) {
    return undefined;
  }
  return playlistUrl != null ? { tracks, playlistUrl } : { tracks };
}

export function FeedPost_fromWorkout(
  record: IHistoryRecord,
  history: IHistoryRecord[],
  settings: ISettings,
  music: IMusicSession | undefined
): IFeedDraft {
  const exercises = record.entries
    .map((entry) => feedExercise(entry, settings))
    .filter((e) => e.sets > 0)
    .sort((a, b) => b.sets - a.sets)
    .slice(0, maxExercises);
  const payload: IFeedWorkoutPayload = {
    v: 1,
    programName: clip(record.programName),
    dayName: clip(record.dayName),
    startTime: record.startTime,
    durationMs: History_workoutTime(record),
    volume: feedWeight(History_totalRecordWeight(record, settings)),
    sets: History_totalRecordSets(record),
    exercises,
    prs: feedPrs(record, history, settings),
  };
  const feedMusic = FeedPost_music(music);
  if (feedMusic != null) {
    payload.music = feedMusic;
  }
  return { kind: "workout", clientKey: FeedPost_workoutKey(record.id), payload };
}

export function FeedPost_fromMeal(day: string, meal: IFoodMeal, entries: IFoodEntry[]): IFeedDraft | undefined {
  const own = entries.filter((e) => e.day === day && e.meal === meal);
  if (own.length === 0) {
    return undefined;
  }
  const items = own.slice(0, maxMealItems).map((e) => {
    const item: IFeedMealItem = { name: clip(e.name), calories: Math.round(e.nutrients.calories) };
    if (e.grams != null) {
      item.grams = Math.round(e.grams);
    }
    return item;
  });
  const payload: IFeedMealPayload = { v: 1, day, meal, items, totals: FoodLog_sum(own.map((e) => e.nutrients)) };
  return { kind: "meal", clientKey: FeedPost_mealKey(day, meal), payload };
}

type IRecord = Record<string, unknown>;

function rec(raw: unknown): IRecord | undefined {
  return raw != null && typeof raw === "object" && !Array.isArray(raw) ? (raw as IRecord) : undefined;
}

function str(raw: unknown): string | undefined {
  return typeof raw === "string" && raw.length <= maxText ? raw : undefined;
}

function num(raw: unknown): number | undefined {
  return typeof raw === "number" && isFinite(raw) && raw >= 0 ? raw : undefined;
}

function list<T>(raw: unknown, max: number, parse: (item: unknown) => T | undefined): T[] | undefined {
  if (!Array.isArray(raw) || raw.length > max) {
    return undefined;
  }
  const result: T[] = [];
  for (const item of raw) {
    const parsed = parse(item);
    if (parsed == null) {
      return undefined;
    }
    result.push(parsed);
  }
  return result;
}

function parseWeight(raw: unknown): IFeedWeight | undefined {
  const r = rec(raw);
  const value = num(r?.value);
  if (value == null || (r?.unit !== "kg" && r?.unit !== "lb")) {
    return undefined;
  }
  return { value, unit: r.unit };
}

function parseExercise(raw: unknown): IFeedExercise | undefined {
  const r = rec(raw);
  const name = str(r?.name);
  const sets = num(r?.sets);
  if (r == null || name == null || sets == null) {
    return undefined;
  }
  if (r.best == null) {
    return { name, sets };
  }
  const best = rec(r.best);
  const weight = parseWeight(best?.weight);
  const reps = num(best?.reps);
  return weight != null && reps != null ? { name, sets, best: { weight, reps } } : undefined;
}

function parsePr(raw: unknown): IFeedPr | undefined {
  const r = rec(raw);
  const exercise = str(r?.exercise);
  const weight = parseWeight(r?.weight);
  const reps = num(r?.reps);
  if (r == null || exercise == null || weight == null || reps == null || (r.kind !== "weight" && r.kind !== "e1rm")) {
    return undefined;
  }
  return { exercise, kind: r.kind, weight, reps };
}

function parseTrack(raw: unknown): IFeedTrack | undefined {
  const r = rec(raw);
  const uri = str(r?.uri);
  const name = str(r?.name);
  const artists = str(r?.artists);
  if (r == null || uri == null || !trackUriPattern.test(uri) || name == null || artists == null) {
    return undefined;
  }
  if (r.imageUrl == null) {
    return { uri, name, artists };
  }
  const imageUrl = typeof r.imageUrl === "string" && r.imageUrl.startsWith(imageOrigin) ? r.imageUrl : undefined;
  return imageUrl != null ? { uri, name, artists, imageUrl } : undefined;
}

function parseMusic(raw: unknown): IFeedMusic | undefined {
  const r = rec(raw);
  const tracks = list(r?.tracks, maxTracks, parseTrack);
  if (r == null || tracks == null) {
    return undefined;
  }
  if (r.playlistUrl == null) {
    return { tracks };
  }
  return typeof r.playlistUrl === "string" && playlistUrlPattern.test(r.playlistUrl)
    ? { tracks, playlistUrl: r.playlistUrl }
    : undefined;
}

function parseWorkout(raw: unknown): IFeedWorkoutPayload | undefined {
  const r = rec(raw);
  if (r == null || r.v !== 1) {
    return undefined;
  }
  const programName = str(r.programName);
  const dayName = str(r.dayName);
  const startTime = num(r.startTime);
  const durationMs = num(r.durationMs);
  const volume = parseWeight(r.volume);
  const sets = num(r.sets);
  const exercises = list(r.exercises, maxExercises, parseExercise);
  const prs = list(r.prs, maxPrs, parsePr);
  const music = r.music == null ? undefined : parseMusic(r.music);
  if (
    programName == null ||
    dayName == null ||
    startTime == null ||
    durationMs == null ||
    volume == null ||
    sets == null ||
    exercises == null ||
    prs == null ||
    (r.music != null && music == null)
  ) {
    return undefined;
  }
  const payload: IFeedWorkoutPayload = { v: 1, programName, dayName, startTime, durationMs, volume, sets, exercises, prs };
  if (music != null) {
    payload.music = music;
  }
  return payload;
}

function parseNutrients(raw: unknown): INutrients | undefined {
  const r = rec(raw);
  const calories = num(r?.calories);
  const protein = num(r?.protein);
  const carbs = num(r?.carbs);
  const fat = num(r?.fat);
  return calories != null && protein != null && carbs != null && fat != null
    ? { calories, protein, carbs, fat }
    : undefined;
}

function parseMealItem(raw: unknown): IFeedMealItem | undefined {
  const r = rec(raw);
  const name = str(r?.name);
  const calories = num(r?.calories);
  if (r == null || name == null || calories == null) {
    return undefined;
  }
  if (r.grams == null) {
    return { name, calories };
  }
  const grams = num(r.grams);
  return grams != null ? { name, grams, calories } : undefined;
}

function parseMeal(raw: unknown): IFeedMealPayload | undefined {
  const r = rec(raw);
  if (r == null || r.v !== 1 || typeof r.day !== "string" || !dayPattern.test(r.day)) {
    return undefined;
  }
  const meal = FoodLog_meals.find((m) => m === r.meal);
  const items = list(r.items, maxMealItems, parseMealItem);
  const totals = parseNutrients(r.totals);
  if (meal == null || items == null || totals == null) {
    return undefined;
  }
  return { v: 1, day: r.day, meal, items, totals };
}

export function FeedPost_withMusic(payload: unknown, music: IFeedMusic): IFeedWorkoutPayload | undefined {
  const workout = parseWorkout(payload);
  return workout != null ? { ...workout, music } : undefined;
}

export function FeedPost_parse(row: unknown): IFeedPost | undefined {
  const r = rec(row);
  if (r == null || typeof r.id !== "string" || typeof r.author_id !== "string" || typeof r.created_at !== "string") {
    return undefined;
  }
  const username = str(rec(r.profiles)?.username);
  const audience = r.visibility === "public" ? "public" : r.visibility === "friends" ? "friends" : undefined;
  if (username == null || audience == null) {
    return undefined;
  }
  let content: IFeedContent | undefined;
  if (r.kind === "workout") {
    const payload = parseWorkout(r.payload);
    content = payload != null ? { kind: "workout", payload } : undefined;
  } else if (r.kind === "meal") {
    const payload = parseMeal(r.payload);
    content = payload != null ? { kind: "meal", payload } : undefined;
  }
  if (content == null) {
    return undefined;
  }
  const post: IFeedPost = { id: r.id, authorId: r.author_id, username, createdAt: r.created_at, audience, content };
  if (typeof r.comment === "string" && r.comment !== "" && r.comment.length <= FeedPost_maxComment) {
    post.comment = r.comment;
  }
  return post;
}

export function FeedPost_parsePage(rows: unknown[]): IFeedPage {
  const posts = rows.map(FeedPost_parse).filter((p): p is IFeedPost => p != null);
  const last = rec(rows[rows.length - 1]);
  if (rows.length < FeedPost_pageSize || typeof last?.created_at !== "string" || typeof last.id !== "string") {
    return { posts };
  }
  return { posts, next: { createdAt: last.created_at, id: last.id } };
}
