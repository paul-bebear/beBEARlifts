import { IStorage } from "../types";
import { FoodLog_parse, IFoodLog } from "./foodLog";
import { IMusicLog, MusicLog_parse } from "./musicLog";
import { BodyScans_parse, IBodyScanLog } from "./bodyScans";
import { IWarmupLog, WarmupPlan_parseLog } from "./warmupPlan";
import { IReportLog, WorkoutReport_parseLog } from "./workoutReport";
import { ISetClipLog, SetClips_parse } from "./setClips";
import { IRunLog, RunLog_parse } from "./runLog";
import { ExportFilename_dated } from "./exportFilename";
import { IProgramGoalLog, ProgramGoal_parse } from "./programGoal";
import { IStepsLog, Steps_parse } from "./steps";
import { DailyChecklist_parse, IChecklistLog } from "./dailyChecklist";
import { BearStoreData_empty, BearStoreData_parse, IBearStoreData } from "./bearStoreData";
import { INotesLog, Notes_empty, Notes_parse } from "./notes";
import { IWeekScheduleLog, WeekSchedule_empty, WeekSchedule_parse } from "./weekSchedule";
import { JournalExport_files } from "./journalExport";
import { FoodLog_dayKey } from "./foodLog";
import { History_getPersonalRecords } from "./history";
import { IProgressPhotoIndexEntry, ProgressPhotos_parseIndex } from "./progressPhotos";
import { CubNumber_empty, CubNumber_parse, ICubState } from "./cubNumber";

export const FullBackup_format = "bebearlifts-backup";

// The AI reading the file has no other context, so the file explains itself.
const readme = [
  "Backup of the beBEAR app. Weights use the unit in workouts.settings.units.",
  "workouts.history: one record per finished workout. Each of its entries is an exercise; each set has reps, weight, completedReps, completedWeight, completedRpe (10 minus reps in reserve) and timestamp (ms, when the set was ticked).",
  "workouts.stats: body measurements over time, under weight, length and percentage (body fat). workouts.programs: the training programs, written in Liftoscript.",
  "food.entries: food eaten, with calories and macros per entry. food.goals: daily targets. food.profile: height, sex, birth year, activity, goal.",
  "body.scans: gym scale scans (weight, body fat %, muscle mass, body water %, bone mass, visceral fat, BMR, metabolic age), newest first. Masses use each scan's unit.",
  "warmups.plans: saved warmup items and their completion ticks. A workoutId of 0 does not identify a finished workout; do not assume every plan matches a workouts.history id.",
  "reports.reports: the report after each workout: what changed per exercise against the last 4 weeks, the user's answers (onPurpose, feltOff, hurt, mistake, better, same, worse) and the coach's note.",
  "music.sessions: songs played during each workout, matched by session id to workouts.history id. startedAt is ms; heardMs is how long the song played; isKept false means skipped.",
  "clips.clips: filmed sets matched by workoutId, setId and exerciseId. timestamp is ms, size is bytes, duration is seconds. Includes small JPEG thumbnails; video files stay in Photos or downloads.",
  "goal.current: the training goal (buildMuscle, loseFat or maintain), its pace, daily step band, body fat % and start date (ms) and weight. goal.past: earlier goals, newest first.",
  "steps.days: step count per local day (YYYY-MM-DD), from Apple Health or typed by hand. steps.goal: the daily step goal.",
  "photos: progress photos, newest first, as id and timestamp (ms). The JPEGs are not in this file. The cloud backup keeps each one at photos/<id>.jpg next to it.",
  "checklist.checkIns: days (YYYY-MM-DD) with a nutrition check-in. checklist.committedAt: ms when the user tapped I'm Committed on the streak screen.",
  "notes.notes: the user's Journal notes, one per entry, with day (YYYY-MM-DD), title and a Markdown body. kind checkIn is the day's check-in: energy, soreness and mood from 1 (sad face) to 5 (happy face), and the reflection as the body.",
  "journal: one Markdown file per day, keyed by path journal/YYYY-MM-DD.md, written from the workouts, food, music, weigh-ins and notes above. It is a readable copy; restore reads the parts above.",
  "runs.runs: GPS runs, newest first. startedAt and endedAt are ms; distanceM is metres; movingMs leaves out pauses; elevationGainM is metres climbed. splits: moving ms for each full km. route: simplified [lat, lon] lines, one per stretch between pauses.",
  "bear: the bebear_bear store. line is male or female. celebratedLevel is the highest level-up shown. seenBadges lists badge ids already shown. spent is the honey spent in the shop.",
  "schedule: the bebear_schedule store. programs maps a program id to 7 entries, Monday first. Each entry is the position of a program day in its week (0 is the first day), or null for a rest day.",
  "cub: the bebear_cub store. number is the account's cub number in sign-up order, from the server; userId is the account it belongs to; fetchedAt is ms.",
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
  clips: ISetClipLog;
  runs: IRunLog;
  goal: IProgramGoalLog;
  steps: IStepsLog;
  checklist: IChecklistLog;
  bear: IBearStoreData;
  notes?: INotesLog;
  schedule: IWeekScheduleLog;
  cub: ICubState;
  photos: IProgressPhotoIndexEntry[];
  journal: Record<string, string>;
}

export interface IFullBackupParts {
  storage: IStorage;
  food: IFoodLog;
  music: IMusicLog;
  body: IBodyScanLog;
  warmups: IWarmupLog;
  reports: IReportLog;
  clips: ISetClipLog;
  runs: IRunLog;
  goal: IProgramGoalLog;
  steps: IStepsLog;
  checklist: IChecklistLog;
  bear?: IBearStoreData;
  notes?: INotesLog;
  schedule?: IWeekScheduleLog;
  cub?: ICubState;
  photos?: IProgressPhotoIndexEntry[];
}

export function FullBackup_build(parts: IFullBackupParts, now: number): IFullBackup {
  const { storage, food, music, body, warmups, reports, clips, runs, goal, steps, checklist, notes } = parts;
  const journal = JournalExport_files({
    today: FoodLog_dayKey(new Date(now)),
    history: storage.history,
    settings: storage.settings,
    prs: History_getPersonalRecords(storage.history),
    food,
    music,
    weights: storage.stats.weight.weight ?? [],
    notes: notes ?? Notes_empty(),
  });
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
    clips: SetClips_parse(clips),
    runs,
    goal,
    steps,
    checklist,
    bear: BearStoreData_parse(parts.bear ?? BearStoreData_empty()),
    notes,
    schedule: WeekSchedule_parse(parts.schedule ?? WeekSchedule_empty()),
    cub: CubNumber_parse(parts.cub ?? CubNumber_empty()),
    photos: ProgressPhotos_parseIndex(parts.photos ?? []),
    journal,
  };
}

export function FullBackup_filename(now: number): string {
  return ExportFilename_dated("bebearlifts-backup-", now);
}

export interface IFullBackupContents {
  storage: unknown;
  food?: IFoodLog;
  music?: IMusicLog;
  body?: IBodyScanLog;
  warmups?: IWarmupLog;
  reports?: IReportLog;
  clips?: ISetClipLog;
  runs?: IRunLog;
  goal?: IProgramGoalLog;
  steps?: IStepsLog;
  checklist?: IChecklistLog;
  bear?: IBearStoreData;
  notes?: INotesLog;
  schedule?: IWeekScheduleLog;
  cub?: ICubState;
  photos?: IProgressPhotoIndexEntry[];
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
    clips: r.clips != null ? SetClips_parse(r.clips) : undefined,
    runs: r.runs != null ? RunLog_parse(r.runs) : undefined,
    goal: r.goal != null ? ProgramGoal_parse(r.goal) : undefined,
    steps: r.steps != null ? Steps_parse(r.steps) : undefined,
    checklist: r.checklist != null ? DailyChecklist_parse(r.checklist) : undefined,
    bear: r.bear != null ? BearStoreData_parse(r.bear) : undefined,
    notes: r.notes != null ? Notes_parse(r.notes) : undefined,
    schedule: r.schedule != null ? WeekSchedule_parse(r.schedule) : undefined,
    cub: r.cub != null ? CubNumber_parse(r.cub) : undefined,
    photos: r.photos != null ? ProgressPhotos_parseIndex(r.photos) : undefined,
  };
}

export function FullBackup_keepSpotifyLogin(imported: IMusicLog, current: IMusicLog): IMusicLog {
  return { ...imported, tokens: current.tokens, displayName: current.displayName ?? imported.displayName };
}
