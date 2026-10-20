import { useEffect, useState } from "react";
import { BodyScans_empty, BodyScans_parse, IBodyScanLog } from "../models/bodyScans";
import { IndexedDBUtils_get, IndexedDBUtils_set } from "./indexeddb";

export const BodyScanStore_key = "bebear_bodyscans";

type IListener = (log: IBodyScanLog) => void;

let current: IBodyScanLog = BodyScans_empty();
let loadPromise: Promise<void> | undefined;
let writeChain: Promise<void> = Promise.resolve();
const listeners = new Set<IListener>();

function notify(): void {
  for (const listener of listeners) {
    listener(current);
  }
}

export function BodyScanStore_load(): Promise<IBodyScanLog> {
  if (loadPromise == null) {
    loadPromise = IndexedDBUtils_get(BodyScanStore_key)
      .then((raw) => {
        current = BodyScans_parse(typeof raw === "string" ? JSON.parse(raw) : undefined);
        notify();
      })
      .catch(() => undefined);
  }
  return loadPromise.then(() => current);
}

export async function BodyScanStore_update(fn: (log: IBodyScanLog) => IBodyScanLog): Promise<void> {
  await BodyScanStore_load();
  current = fn(current);
  notify();
  const snapshot = JSON.stringify(current);
  writeChain = writeChain.then(() => IndexedDBUtils_set(BodyScanStore_key, snapshot));
  return writeChain;
}

export function useBodyScans(): IBodyScanLog {
  const [log, setLog] = useState<IBodyScanLog>(current);
  useEffect(() => {
    listeners.add(setLog);
    BodyScanStore_load().then(setLog);
    return () => {
      listeners.delete(setLog);
    };
  }, []);
  return log;
}
