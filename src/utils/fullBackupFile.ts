import { IStorage } from "../types";
import { FullBackup_build, FullBackup_keepSpotifyLogin, IFullBackupContents } from "../models/fullBackup";
import { FoodLogStore_load, FoodLogStore_replace } from "./foodLogStore";
import { MusicStore_load, MusicStore_update } from "./musicStore";
import { BodyScanStore_load, BodyScanStore_update } from "./bodyScanStore";
import { WarmupStore_load, WarmupStore_update } from "./warmupStore";
import { ReportStore } from "./reportStore";
import { SetClipStore } from "./setClipStore";
import { RunStore } from "./runStore";
import { ProgramGoalStore } from "./programGoalStore";
import { StepsStore } from "./stepsStore";
import { ChecklistStore } from "./checklistStore";
import { BearStore } from "./bearStore";

export async function FullBackupFile_build(getStorage: () => IStorage): Promise<{ text: string; now: number }> {
  const [food, music, body, warmups, reports, clips, runs, goal, steps, checklist, bear] = await Promise.all([
    FoodLogStore_load(),
    MusicStore_load(),
    BodyScanStore_load(),
    WarmupStore_load(),
    ReportStore.load(),
    SetClipStore.load(),
    RunStore.load(),
    ProgramGoalStore.load(),
    StepsStore.load(),
    ChecklistStore.load(),
    BearStore.load(),
  ]);
  const now = Date.now();
  const backup = FullBackup_build(
    { storage: getStorage(), food, music, body, warmups, reports, clips, runs, goal, steps, checklist, bear },
    now
  );
  return { text: JSON.stringify(backup, null, 2), now };
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
export async function FullBackupFile_restore(contents: IFullBackupContents): Promise<void> {
  const steps = await Promise.all([
    step(contents.food, FoodLogStore_load, FoodLogStore_replace),
    step(contents.music, MusicStore_load, (value) =>
      MusicStore_update((current) => FullBackup_keepSpotifyLogin(value, current))
    ),
    step(contents.body, BodyScanStore_load, (value) => BodyScanStore_update(() => value)),
    step(contents.warmups, WarmupStore_load, (value) => WarmupStore_update(() => value)),
    step(contents.reports, ReportStore.load, (value) => ReportStore.update(() => value)),
    step(contents.clips, SetClipStore.load, (value) => SetClipStore.update(() => value)),
    step(contents.runs, RunStore.load, (value) => RunStore.update(() => value)),
    step(contents.goal, ProgramGoalStore.load, (value) => ProgramGoalStore.update(() => value)),
    step(contents.steps, StepsStore.load, (value) => StepsStore.update(() => value)),
    step(contents.checklist, ChecklistStore.load, (value) => ChecklistStore.update(() => value)),
    step(contents.bear, BearStore.load, (value) => BearStore.update(() => value)),
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
