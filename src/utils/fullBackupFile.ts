import { IStorage } from "../types";
import { FullBackup_build, FullBackup_keepSpotifyLogin, IFullBackupContents } from "../models/fullBackup";
import { ICloudStoresInput } from "../models/cloudBackup";
import { IFoodLog } from "../models/foodLog";
import { INotesLog } from "../models/notes";
import { IRunLog } from "../models/runLog";
import { IBodyScanLog } from "../models/bodyScans";
import { IChecklistLog } from "../models/dailyChecklist";
import { IProgressPhotoLog, ProgressPhotos_index } from "../models/progressPhotos";
import { FoodLogStore_load, FoodLogStore_loadStrict, FoodLogStore_replace } from "./foodLogStore";
import { MusicStore_load, MusicStore_loadStrict, MusicStore_update } from "./musicStore";
import { BodyScanStore_load, BodyScanStore_loadStrict, BodyScanStore_replace } from "./bodyScanStore";
import { WarmupStore_load, WarmupStore_loadStrict, WarmupStore_replace } from "./warmupStore";
import { ReportStore } from "./reportStore";
import { SetClipStore } from "./setClipStore";
import { RunStore } from "./runStore";
import { ProgramGoalStore } from "./programGoalStore";
import { StepsStore } from "./stepsStore";
import { ChecklistStore } from "./checklistStore";
import { BearStore } from "./bearStore";
import { NotesStore } from "./notesStore";
import { WeekScheduleStore } from "./weekScheduleStore";
import { ProgressPhotoStore } from "./progressPhotoStore";

export function FullBackupFile_stores(parts: {
  food: IFoodLog;
  notes: INotesLog;
  runs: IRunLog;
  body: IBodyScanLog;
  checklist: IChecklistLog;
  photos: IProgressPhotoLog;
}): ICloudStoresInput {
  return {
    food: parts.food.entries,
    notes: parts.notes.notes,
    runs: parts.runs.runs,
    scans: parts.body.scans,
    checkIns: parts.checklist.checkIns,
    photos: parts.photos.photos,
  };
}

// Every read is strict. A store that fails to read stops the backup, so its empty value never replaces the cloud copy.
export async function FullBackupFile_build(
  getStorage: () => IStorage
): Promise<{ text: string; now: number; stores: ICloudStoresInput }> {
  const [food, music, body, warmups, reports, clips, runs, goal, steps, checklist, bear, notes, schedule, photos] =
    await Promise.all([
      FoodLogStore_loadStrict(),
      MusicStore_loadStrict(),
      BodyScanStore_loadStrict(),
      WarmupStore_loadStrict(),
      ReportStore.loadStrict(),
      SetClipStore.loadStrict(),
      RunStore.loadStrict(),
      ProgramGoalStore.loadStrict(),
      StepsStore.loadStrict(),
      ChecklistStore.loadStrict(),
      BearStore.loadStrict(),
      NotesStore.loadStrict(),
      WeekScheduleStore.loadStrict(),
      ProgressPhotoStore.loadStrict(),
    ]);
  const now = Date.now();
  const backup = FullBackup_build(
    {
      storage: getStorage(),
      food,
      music,
      body,
      warmups,
      reports,
      clips,
      runs,
      goal,
      steps,
      checklist,
      bear,
      notes,
      schedule,
      photos: ProgressPhotos_index(photos),
    },
    now
  );
  return {
    text: JSON.stringify(backup, null, 2),
    now,
    stores: FullBackupFile_stores({ food, notes, runs, body, checklist, photos }),
  };
}

interface IRestoreStep {
  apply: () => Promise<void>;
  undo: () => Promise<void>;
}

async function step<T>(
  restored: T | undefined,
  load: () => Promise<T>,
  write: (value: T) => Promise<void>
): Promise<IRestoreStep | undefined> {
  if (restored == null) {
    return undefined;
  }
  const before = await load();
  return { apply: () => write(restored), undo: () => write(before) };
}

// The stores have no shared transaction, so a failed write puts back the stores already written and rethrows.
// Each write replaces without reading, so a restore also repairs a store whose saved text cannot be parsed.
export async function FullBackupFile_restore(contents: IFullBackupContents): Promise<void> {
  const steps = await Promise.all([
    step(contents.food, FoodLogStore_load, FoodLogStore_replace),
    step(contents.music, MusicStore_load, (value) =>
      MusicStore_update((current) => FullBackup_keepSpotifyLogin(value, current))
    ),
    step(contents.body, BodyScanStore_load, BodyScanStore_replace),
    step(contents.warmups, WarmupStore_load, WarmupStore_replace),
    step(contents.reports, ReportStore.load, ReportStore.replace),
    step(contents.clips, SetClipStore.load, SetClipStore.replace),
    step(contents.runs, RunStore.load, RunStore.replace),
    step(contents.goal, ProgramGoalStore.load, ProgramGoalStore.replace),
    step(contents.steps, StepsStore.load, StepsStore.replace),
    step(contents.checklist, ChecklistStore.load, ChecklistStore.replace),
    step(contents.bear, BearStore.load, BearStore.replace),
    step(contents.notes, NotesStore.load, NotesStore.replace),
    step(contents.schedule, WeekScheduleStore.load, WeekScheduleStore.replace),
  ]);
  const done: IRestoreStep[] = [];
  for (const s of steps) {
    if (s == null) {
      continue;
    }
    try {
      await s.apply();
      done.push(s);
    } catch (error) {
      for (const written of done.reverse()) {
        await written.undo().catch(() => undefined);
      }
      throw error;
    }
  }
}
