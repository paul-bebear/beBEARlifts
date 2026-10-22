import { ICloudBackupSummary, ICloudRestoreOffer } from "./cloudBackup";
import { FullBackup_unwrap } from "./fullBackup";

export interface ICloudBackupHoldings {
  summary: ICloudBackupSummary;
  workoutIds: number[];
  foodEntryIds: string[];
}

export type ICloudBackupDecision = { kind: "upload" } | { kind: "ask"; offer: ICloudRestoreOffer };

export function CloudBackupCompare_holdings(
  history: Array<{ id: unknown }>,
  food: Array<{ id: string; day: string }>,
  exportedAt?: string
): ICloudBackupHoldings {
  const workoutIds = history.map((h) => h.id).filter((id): id is number => typeof id === "number");
  return {
    summary: { exportedAt, workouts: history.length, foodDays: new Set(food.map((e) => e.day)).size },
    workoutIds,
    foodEntryIds: food.map((e) => e.id),
  };
}

export function CloudBackupCompare_read(text: string): ICloudBackupHoldings | undefined {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return undefined;
  }
  const contents = FullBackup_unwrap(parsed);
  const storage = (contents.storage ?? {}) as Record<string, unknown>;
  const history = Array.isArray(storage.history) ? (storage.history as Array<{ id: unknown }>) : [];
  const exportedAt = (parsed as Record<string, unknown> | null)?.exportedAt;
  return CloudBackupCompare_holdings(
    history,
    contents.food?.entries ?? [],
    typeof exportedAt === "string" ? exportedAt : undefined
  );
}

// An unreadable cloud file holds nothing a restore could bring back, so the upload replaces it.
export function CloudBackupCompare_decide(
  cloud: ICloudBackupHoldings | undefined,
  phone: ICloudBackupHoldings,
  syncedExportedAt: string | undefined
): ICloudBackupDecision {
  if (cloud == null || (cloud.summary.exportedAt != null && cloud.summary.exportedAt === syncedExportedAt)) {
    return { kind: "upload" };
  }
  const phoneWorkouts = new Set(phone.workoutIds);
  const phoneFood = new Set(phone.foodEntryIds);
  const cloudOnly =
    cloud.workoutIds.some((id) => !phoneWorkouts.has(id)) || cloud.foodEntryIds.some((id) => !phoneFood.has(id));
  return cloudOnly ? { kind: "ask", offer: { cloud: cloud.summary, phone: phone.summary } } : { kind: "upload" };
}

function count(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

function CloudBackupCompare_holds(summary: ICloudBackupSummary): string {
  return `${count(summary.workouts, "workout", "workouts")} and ${count(summary.foodDays, "day", "days")} of food`;
}

export function CloudBackupCompare_offerText(offer: ICloudRestoreOffer, when: string): string {
  return (
    `Your cloud backup from ${when} has ${CloudBackupCompare_holds(offer.cloud)}. ` +
    `This phone has ${CloudBackupCompare_holds(offer.phone)}. ` +
    "Automatic backups wait until you choose."
  );
}

export function CloudBackupCompare_restoreText(
  cloud: ICloudBackupSummary,
  phone: ICloudBackupSummary,
  when: string
): string {
  return (
    `Replace this phone's data with the cloud copy from ${when}?\n\n` +
    `Cloud copy: ${CloudBackupCompare_holds(cloud)}.\n` +
    `This phone: ${CloudBackupCompare_holds(phone)}.\n\n` +
    "This replaces workouts, settings, food, music, body scans, warmups, reports, runs and clip records. " +
    "Progress photos stay as they are."
  );
}

export function CloudBackupCompare_keepText(offer: ICloudRestoreOffer, when: string): string {
  return (
    `Replace the cloud backup from ${when} with this phone's data?\n\n` +
    `Cloud backup: ${CloudBackupCompare_holds(offer.cloud)}.\n` +
    `This phone: ${CloudBackupCompare_holds(offer.phone)}.\n\n` +
    "The app saves the cloud backup first. Restore it later from Settings → Cloud backup → Restore an older copy."
  );
}

export function CloudBackupCompare_when(exportedAt: string | undefined): string {
  const time = exportedAt != null ? Date.parse(exportedAt) : NaN;
  return Number.isFinite(time) ? new Date(time).toLocaleString() : "an unknown date";
}
