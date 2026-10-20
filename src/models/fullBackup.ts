import { IStorage } from "../types";
import { FoodLog_parse, IFoodLog } from "./foodLog";
import { IMusicLog, MusicLog_parse } from "./musicLog";
import { BodyScans_parse, IBodyScanLog } from "./bodyScans";
import { IWarmupLog, WarmupPlan_parseLog } from "./warmupPlan";
import { IReportLog, WorkoutReport_parseLog } from "./workoutReport";

export const FullBackup_format = "bebearlifts-backup";

// The AI reading the file has no other context, so the file explains itself.
const readme = [
  "Backup of the beBEARlifts app (a fork of Liftosaur). Weights use the unit in workouts.settings.units.",
  "workouts.history: one record per finished workout. Each of its entries is an exercise; each set has reps, weight, completedReps, completedWeight, completedRpe (10 minus reps in reserve) and timestamp (ms, when the set was ticked).",
  "workouts.stats: body measurements over time, under weight, length and percentage (body fat). workouts.programs: the training programs, written in Liftoscript.",
  "food.entries: food eaten, with calories and macros per entry. food.goals: daily targets. food.profile: height, sex, birth year, activity, goal.",
  "body.scans: gym scale scans (weight, body fat %, muscle mass, body water %, bone mass, visceral fat, BMR, metabolic age), newest first. Masses use each scan's unit.",
  "warmups.plans: the warmup made for each workout (workoutId matches workouts.history id), with which items were ticked done.",
  "reports.reports: the report after each workout: what changed per exercise against the last 4 weeks, the user's answers (onPurpose, feltOff, hurt, mistake, better, same, worse) and the coach's note.",
  "music.sessions: songs played during each workout, matched by session id to workouts.history id. startedAt is ms; heardMs is how long the song played; isKept false means skipped.",
].join("\n");

export interface IFullBackup {
  format: typeof FullBackup_format;
  version: 1;
  exportedAt: string;
  readme: string;
  workouts: IStorage;
  food: IFoodLog;
  music: IMusicLog;
  body: IBodyScanLog;
  warmups: IWarmupLog;
  reports: IReportLog;
}

export interface IFullBackupParts {
  storage: IStorage;
  food: IFoodLog;
  music: IMusicLog;
  body: IBodyScanLog;
  warmups: IWarmupLog;
  reports: IReportLog;
}

export function FullBackup_build(parts: IFullBackupParts, now: number): IFullBackup {
  const { storage, food, music, body, warmups, reports } = parts;
  return {
    format: FullBackup_format,
    version: 1,
    exportedAt: new Date(now).toISOString(),
    readme,
    workouts: storage,
    food,
    music: { ...music, tokens: undefined },
    body,
    warmups,
    reports,
  };
}

export function FullBackup_filename(now: number): string {
  return `bebearlifts-backup-${new Date(now).toISOString().slice(0, 10)}.json`;
}

export interface IFullBackupContents {
  storage: unknown;
  food?: IFoodLog;
  music?: IMusicLog;
  body?: IBodyScanLog;
  warmups?: IWarmupLog;
  reports?: IReportLog;
}

// A plain Liftosaur export has no format field, so it passes through as the storage alone.
export function FullBackup_unwrap(parsed: unknown): IFullBackupContents {
  const r = (parsed ?? {}) as Record<string, unknown>;
  if (r.format !== FullBackup_format) {
    return { storage: parsed };
  }
  return {
    storage: r.workouts,
    food: r.food != null ? FoodLog_parse(r.food) : undefined,
    music: r.music != null ? MusicLog_parse(r.music) : undefined,
    body: r.body != null ? BodyScans_parse(r.body) : undefined,
    warmups: r.warmups != null ? WarmupPlan_parseLog(r.warmups) : undefined,
    reports: r.reports != null ? WorkoutReport_parseLog(r.reports) : undefined,
  };
}

export function FullBackup_keepSpotifyLogin(imported: IMusicLog, current: IMusicLog): IMusicLog {
  return { ...imported, tokens: current.tokens, displayName: current.displayName ?? imported.displayName };
}
