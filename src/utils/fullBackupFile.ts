import { IStorage } from "../types";
import { FullBackup_build } from "../models/fullBackup";
import { FoodLogStore_load } from "./foodLogStore";
import { MusicStore_load } from "./musicStore";
import { BodyScanStore_load } from "./bodyScanStore";
import { WarmupStore_load } from "./warmupStore";
import { ReportStore } from "./reportStore";

export async function FullBackupFile_build(getStorage: () => IStorage): Promise<{ text: string; now: number }> {
  const [food, music, body, warmups, reports] = await Promise.all([
    FoodLogStore_load(),
    MusicStore_load(),
    BodyScanStore_load(),
    WarmupStore_load(),
    ReportStore.load(),
  ]);
  const now = Date.now();
  const backup = FullBackup_build({ storage: getStorage(), food, music, body, warmups, reports }, now);
  return { text: JSON.stringify(backup, null, 2), now };
}
