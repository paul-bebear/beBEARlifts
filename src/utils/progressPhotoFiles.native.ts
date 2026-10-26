import RNFS from "react-native-fs";
import {
  IProgressPhoto,
  ProgressPhotos_base64,
  ProgressPhotos_dataUrl,
  ProgressPhotos_fileName,
  ProgressPhotos_insert,
  ProgressPhotos_markFiles,
  ProgressPhotos_migration,
  ProgressPhotos_remove,
} from "../models/progressPhotos";
import { ProgressPhotoStore } from "./progressPhotoStore";

export const ProgressPhotoFiles_dir: string | undefined = `${RNFS.DocumentDirectoryPath}/progress-photos`;
const dir = ProgressPhotoFiles_dir as string;

function pathOf(id: number): string {
  return `${dir}/${ProgressPhotos_fileName(id)}`;
}

async function writeFile(id: number, base64: string): Promise<void> {
  await RNFS.mkdir(dir);
  await RNFS.writeFile(pathOf(id), base64, "base64");
}

export async function ProgressPhotoFiles_put(id: number, timestamp: number, base64: string): Promise<boolean> {
  if (ProgressPhotos_dataUrl(base64) == null) {
    return false;
  }
  await writeFile(id, base64);
  let added = false;
  try {
    await ProgressPhotoStore.update((log) => {
      const next = ProgressPhotos_insert(log, { id, timestamp, file: true });
      added = next !== log;
      return next;
    });
  } catch (error) {
    await RNFS.unlink(pathOf(id)).catch(() => undefined);
    throw error;
  }
  if (!added) {
    await RNFS.unlink(pathOf(id)).catch(() => undefined);
  }
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
