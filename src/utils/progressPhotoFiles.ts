import {
  IProgressPhoto,
  ProgressPhotos_base64,
  ProgressPhotos_dataUrl,
  ProgressPhotos_insert,
  ProgressPhotos_remove,
} from "../models/progressPhotos";
import { ProgressPhotoStore } from "./progressPhotoStore";

export const ProgressPhotoFiles_dir: string | undefined = undefined;

export async function ProgressPhotoFiles_put(id: number, timestamp: number, base64: string): Promise<boolean> {
  const dataUrl = ProgressPhotos_dataUrl(base64);
  if (dataUrl == null) {
    return false;
  }
  let added = false;
  await ProgressPhotoStore.update((log) => {
    const next = ProgressPhotos_insert(log, { id, timestamp, dataUrl });
    added = next !== log;
    return next;
  });
  return added;
}

export async function ProgressPhotoFiles_readBase64(photo: IProgressPhoto): Promise<string | undefined> {
  return "dataUrl" in photo ? ProgressPhotos_base64(photo.dataUrl) : undefined;
}

export async function ProgressPhotoFiles_delete(id: number): Promise<void> {
  await ProgressPhotoStore.update((log) => ProgressPhotos_remove(log, id));
}

export async function ProgressPhotoFiles_migrate(): Promise<void> {
  return undefined;
}
