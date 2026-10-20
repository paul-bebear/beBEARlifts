import { useEffect, useState } from "react";
import { IMusicLog, MusicLog_empty, MusicLog_parse } from "../models/musicLog";
import { IndexedDBUtils_get, IndexedDBUtils_set } from "./indexeddb";

export const MusicStore_key = "bebear_music";

type IListener = (log: IMusicLog) => void;

let current: IMusicLog = MusicLog_empty();
let loadPromise: Promise<void> | undefined;
let writeChain: Promise<void> = Promise.resolve();
const listeners = new Set<IListener>();

function notify(): void {
  for (const listener of listeners) {
    listener(current);
  }
}

export function MusicStore_load(): Promise<IMusicLog> {
  if (loadPromise == null) {
    loadPromise = IndexedDBUtils_get(MusicStore_key)
      .then((raw) => {
        current = MusicLog_parse(typeof raw === "string" ? JSON.parse(raw) : undefined);
        notify();
      })
      .catch(() => undefined);
  }
  return loadPromise.then(() => current);
}

export function MusicStore_get(): IMusicLog {
  return current;
}

export async function MusicStore_update(fn: (log: IMusicLog) => IMusicLog): Promise<void> {
  await MusicStore_load();
  const next = fn(current);
  if (next === current) {
    return writeChain;
  }
  current = next;
  notify();
  const snapshot = JSON.stringify(current);
  writeChain = writeChain.then(() => IndexedDBUtils_set(MusicStore_key, snapshot));
  return writeChain;
}

export function MusicStore_subscribe(listener: IListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useMusicLog(): IMusicLog {
  const [log, setLog] = useState<IMusicLog>(current);
  useEffect(() => {
    const unsubscribe = MusicStore_subscribe(setLog);
    MusicStore_load().then(setLog);
    return unsubscribe;
  }, []);
  return log;
}
