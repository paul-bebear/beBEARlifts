import { useEffect, useState } from "react";
import { IWarmupLog, WarmupPlan_empty, WarmupPlan_parseLog } from "../models/warmupPlan";
import { IndexedDBUtils_get, IndexedDBUtils_set } from "./indexeddb";

export const WarmupStore_key = "bebear_warmups";

type IListener = (log: IWarmupLog) => void;

let current: IWarmupLog = WarmupPlan_empty();
let loadPromise: Promise<void> | undefined;
let writeChain: Promise<void> = Promise.resolve();
const listeners = new Set<IListener>();

function notify(): void {
  for (const listener of listeners) {
    listener(current);
  }
}

export function WarmupStore_load(): Promise<IWarmupLog> {
  if (loadPromise == null) {
    loadPromise = IndexedDBUtils_get(WarmupStore_key)
      .then((raw) => {
        current = WarmupPlan_parseLog(typeof raw === "string" ? JSON.parse(raw) : undefined);
        notify();
      })
      .catch(() => undefined);
  }
  return loadPromise.then(() => current);
}

export async function WarmupStore_update(fn: (log: IWarmupLog) => IWarmupLog): Promise<void> {
  await WarmupStore_load();
  current = fn(current);
  notify();
  const snapshot = JSON.stringify(current);
  writeChain = writeChain.then(() => IndexedDBUtils_set(WarmupStore_key, snapshot));
  return writeChain;
}

export function useWarmupLog(): IWarmupLog {
  const [log, setLog] = useState<IWarmupLog>(current);
  useEffect(() => {
    listeners.add(setLog);
    WarmupStore_load().then(setLog);
    return () => {
      listeners.delete(setLog);
    };
  }, []);
  return log;
}
