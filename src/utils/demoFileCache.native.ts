import RNFS from "react-native-fs";
import { ExerciseDemoCache_evictions } from "../models/exerciseDemoCache";

const CACHE_DIR = `${RNFS.CachesDirectoryPath}/exercisedemo`;
const knownMissing: Set<string> = new Set();
const inFlight: Map<string, Promise<void>> = new Map();

export function DemoFileCache_initialUri(fileName: string, remoteUrl: string): string {
  return knownMissing.has(fileName) ? remoteUrl : `file://${CACHE_DIR}/${fileName}`;
}

export function DemoFileCache_markMissing(fileName: string): void {
  knownMissing.add(fileName);
}

async function prune(inUse: string): Promise<void> {
  const files = (await RNFS.readDir(CACHE_DIR))
    .filter((f) => f.isFile() && f.name.endsWith(".webp"))
    .map((f) => ({ name: f.name, bytes: Number(f.size), usedAt: f.mtime?.getTime() ?? 0 }));
  for (const name of ExerciseDemoCache_evictions(files, inUse)) {
    await RNFS.unlink(`${CACHE_DIR}/${name}`).catch(() => undefined);
  }
}

export async function DemoFileCache_touch(fileName: string): Promise<void> {
  await RNFS.touch(`${CACHE_DIR}/${fileName}`, new Date()).catch(() => undefined);
}

export async function DemoFileCache_store(fileName: string, remoteUrl: string): Promise<void> {
  const existing = inFlight.get(fileName);
  if (existing) {
    return existing;
  }
  const path = `${CACHE_DIR}/${fileName}`;
  const task = (async () => {
    try {
      await RNFS.mkdir(CACHE_DIR);
      const tmp = `${path}.part`;
      const result = await RNFS.downloadFile({ fromUrl: remoteUrl, toFile: tmp }).promise;
      if (result.statusCode === 200) {
        await RNFS.moveFile(tmp, path);
        knownMissing.delete(fileName);
        await prune(fileName);
      } else {
        await RNFS.unlink(tmp).catch(() => undefined);
      }
    } catch {
      // Offline or full disk: the demo keeps loading from the network next time.
    } finally {
      inFlight.delete(fileName);
    }
  })();
  inFlight.set(fileName, task);
  return task;
}
