import { CloudBackup_canSyncPhotos } from "../models/cloudBackup";
import {
  IProgressPhotoIndexEntry,
  ProgressPhotos_dataUrl,
  ProgressPhotos_missing,
  ProgressPhotos_syncPlan,
} from "../models/progressPhotos";
import { MealPost_jpegBytes } from "../models/mealPost";
import {
  CloudBackupClient_deletePhoto,
  CloudBackupClient_getPhoto,
  CloudBackupClient_putPhoto,
} from "./cloudBackupClient";
import { CloudStore, ICloudResult } from "./supabaseClient";
import { ProgressPhotoStore } from "./progressPhotoStore";
import { ProgressPhotoFiles_put, ProgressPhotoFiles_readBase64 } from "./progressPhotoFiles";

// 20 photos are 2 to 5 MB, so one return to the app never holds a slow connection for long. The next one continues.
const ProgressPhotoCloud_perRun = 20;

const ok: ICloudResult<undefined> = { ok: true, value: undefined };

async function record(id: number, sent: boolean): Promise<void> {
  await CloudStore.update((state) => {
    const rest = (state.uploadedPhotos ?? []).filter((x) => x !== id);
    return { ...state, uploadedPhotos: sent ? [...rest, id] : rest };
  });
}

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary);
}

export async function ProgressPhotoCloud_sync(): Promise<ICloudResult<undefined>> {
  const state = await CloudStore.load();
  const userId = state.session?.userId;
  if (userId == null || !CloudBackup_canSyncPhotos(state)) {
    return ok;
  }
  const log = await ProgressPhotoStore.loadStrict();
  const plan = ProgressPhotos_syncPlan(log, state.uploadedPhotos ?? []);
  for (const id of plan.remove) {
    const removed = await CloudBackupClient_deletePhoto(userId, id);
    if (!removed.ok) {
      return removed;
    }
    await record(id, false);
  }
  for (const id of plan.upload.slice(0, ProgressPhotoCloud_perRun)) {
    const photo = log.photos.find((p) => p.id === id);
    const base64 = photo != null ? await ProgressPhotoFiles_readBase64(photo) : undefined;
    const dataUrl = base64 != null ? ProgressPhotos_dataUrl(base64) : undefined;
    const bytes = dataUrl != null ? MealPost_jpegBytes(dataUrl, atob) : undefined;
    if (bytes == null) {
      continue;
    }
    const sent = await CloudBackupClient_putPhoto(userId, id, bytes);
    if (!sent.ok) {
      return sent;
    }
    await record(id, true);
  }
  return ok;
}

export async function ProgressPhotoCloud_restore(index: IProgressPhotoIndexEntry[]): Promise<ICloudResult<undefined>> {
  const userId = (await CloudStore.load()).session?.userId;
  if (userId == null) {
    return ok;
  }
  for (const entry of ProgressPhotos_missing(await ProgressPhotoStore.load(), index)) {
    const photo = await CloudBackupClient_getPhoto(userId, entry.id);
    if (!photo.ok) {
      return photo;
    }
    if (photo.value != null && (await ProgressPhotoFiles_put(entry.id, entry.timestamp, toBase64(photo.value)))) {
      await record(entry.id, true);
    }
  }
  return ok;
}
