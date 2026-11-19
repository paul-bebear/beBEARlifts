import RNFS from "react-native-fs";
import {
  IProgressPhoto,
  IProgressPhotoLog,
  IProgressPhotoPutOutcome,
  ProgressPhotos_base64,
  ProgressPhotos_empty,
  ProgressPhotos_fileName,
  ProgressPhotos_insert,
  ProgressPhotos_isFileBase64,
  ProgressPhotos_isTempFileName,
  ProgressPhotos_markFiles,
  ProgressPhotos_migration,
  ProgressPhotos_putUnlink,
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

async function discard(id: number, outcome: IProgressPhotoPutOutcome, log: IProgressPhotoLog): Promise<void> {
  for (const name of ProgressPhotos_putUnlink(id, outcome, log)) {
    await RNFS.unlink(`${dir}/${name}`).catch(() => undefined);
  }
}

export async function ProgressPhotoFiles_put(id: number, timestamp: number, base64: string): Promise<boolean> {
  if (!ProgressPhotos_isFileBase64(base64)) {
    return false;
  }
  const photo = { id, timestamp, file: true as const };
  await RNFS.mkdir(dir);
  await RNFS.writeFile(tempPathOf(id), base64, "base64");
  const before = await ProgressPhotoStore.loadStrict().catch(async (error) => {
    await discard(id, "precheck-refused", ProgressPhotos_empty());
    throw error;
  });
  if (ProgressPhotos_insert(before, photo) === before) {
    await discard(id, "precheck-refused", before);
    return false;
  }
  try {
    await RNFS.unlink(pathOf(id)).catch(() => undefined);
    await RNFS.moveFile(tempPathOf(id), pathOf(id));
  } catch (error) {
    await discard(id, "move-failed", before);
    throw error;
  }
  let after = before;
  let added = false;
  try {
    await ProgressPhotoStore.update((log) => {
      const next = ProgressPhotos_insert(log, photo);
      added = next !== log;
      after = next;
      return next;
    });
  } catch (error) {
    const latest = await ProgressPhotoStore.loadStrict().catch(() => undefined);
    if (latest != null) {
      await discard(id, "failed", latest);
    }
    throw error;
  }
  await discard(id, added ? "added" : "refused", after);
  return added;
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
async function removeStaleTempFiles(): Promise<void> {
  const entries = await RNFS.readDir(dir).catch(() => []);
  for (const entry of entries) {
    if (ProgressPhotos_isTempFileName(entry.name)) {
      await RNFS.unlink(entry.path).catch(() => undefined);
    }
  }
}

export async function ProgressPhotoFiles_migrate(): Promise<void> {
  await removeStaleTempFiles();
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
