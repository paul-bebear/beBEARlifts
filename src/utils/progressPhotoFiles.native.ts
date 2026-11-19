import RNFS from "react-native-fs";
import {
  IProgressPhoto,
  IProgressPhotoPutOutcome,
  ProgressPhotos_base64,
  ProgressPhotos_fileName,
  ProgressPhotos_insert,
  ProgressPhotos_isFileBase64,
  ProgressPhotos_markFiles,
  ProgressPhotos_migration,
  ProgressPhotos_putPlan,
  ProgressPhotos_remove,
  ProgressPhotos_tempFileName,
} from "../models/progressPhotos";
import { ProgressPhotoStore } from "./progressPhotoStore";

const dir = `${RNFS.DocumentDirectoryPath}/progress-photos`;
export const ProgressPhotoFiles_dir: string | undefined = dir;

function pathOf(id: number): string {
  return `${dir}/${ProgressPhotos_fileName(id)}`;
}

function tempPathOf(id: number): string {
  return `${dir}/${ProgressPhotos_tempFileName(id)}`;
}

async function writeFile(id: number, base64: string): Promise<void> {
  await RNFS.mkdir(dir);
  await RNFS.writeFile(pathOf(id), base64, "base64");
}

async function discard(id: number, outcome: IProgressPhotoPutOutcome): Promise<void> {
  for (const name of ProgressPhotos_putPlan(id, outcome).unlink) {
    await RNFS.unlink(`${dir}/${name}`).catch(() => undefined);
  }
}

async function promote(id: number): Promise<void> {
  const final = pathOf(id);
  await RNFS.unlink(final).catch(() => undefined);
  await RNFS.moveFile(tempPathOf(id), final);
}

export async function ProgressPhotoFiles_put(id: number, timestamp: number, base64: string): Promise<boolean> {
  if (!ProgressPhotos_isFileBase64(base64)) {
    return false;
  }
  await RNFS.mkdir(dir);
  await RNFS.writeFile(tempPathOf(id), base64, "base64");
  let added = false;
  try {
    await ProgressPhotoStore.update((log) => {
      const next = ProgressPhotos_insert(log, { id, timestamp, file: true });
      added = next !== log;
      return next;
    });
  } catch (error) {
    await discard(id, "failed");
    throw error;
  }
  if (!ProgressPhotos_putPlan(id, added ? "added" : "refused").promote) {
    await discard(id, "refused");
    return false;
  }
  try {
    await promote(id);
  } catch (error) {
    await ProgressPhotoStore.update((log) => ProgressPhotos_remove(log, id)).catch(() => undefined);
    await discard(id, "failed");
    throw error;
  }
  return true;
}

export async function ProgressPhotoFiles_readBase64(photo: IProgressPhoto): Promise<string | undefined> {
  if ("dataUrl" in photo) {
    return ProgressPhotos_base64(photo.dataUrl);
  }
  return RNFS.readFile(pathOf(photo.id), "base64").catch(() => undefined);
}

export async function ProgressPhotoFiles_delete(id: number): Promise<void> {
  await ProgressPhotoStore.update((log) => ProgressPhotos_remove(log, id));
  await RNFS.unlink(pathOf(id)).catch(() => undefined);
}

// Files go first and the index second, so an app killed halfway keeps the data URLs and tries again next launch.
export async function ProgressPhotoFiles_migrate(): Promise<void> {
  const { files } = ProgressPhotos_migration(await ProgressPhotoStore.loadStrict());
  if (files.length === 0) {
    return;
  }
  const written: number[] = [];
  for (const file of files) {
    try {
      await writeFile(file.id, file.base64);
      written.push(file.id);
    } catch {
      break;
    }
  }
  await ProgressPhotoStore.update((log) => ProgressPhotos_markFiles(log, written));
}
