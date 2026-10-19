import { useEffect, useState } from "react";
import { FoodLog_empty, FoodLog_parse, IFoodLog } from "../models/foodLog";
import { IndexedDBUtils_get, IndexedDBUtils_set } from "./indexeddb";

export const FoodLogStore_key = "bebear_foodlog";

type IListener = (log: IFoodLog) => void;

let current: IFoodLog = FoodLog_empty();
let loadPromise: Promise<IFoodLog> | undefined;
let writeChain: Promise<void> = Promise.resolve();
const listeners = new Set<IListener>();

function notify(): void {
  for (const listener of listeners) {
    listener(current);
  }
}

export function FoodLogStore_load(): Promise<IFoodLog> {
  if (loadPromise == null) {
    loadPromise = IndexedDBUtils_get(FoodLogStore_key)
      .then((raw) => {
        current = FoodLog_parse(typeof raw === "string" ? JSON.parse(raw) : undefined);
        notify();
        return current;
      })
      .catch(() => current);
  }
  return loadPromise;
}

export function FoodLogStore_get(): IFoodLog {
  return current;
}

export async function FoodLogStore_update(fn: (log: IFoodLog) => IFoodLog): Promise<void> {
  await FoodLogStore_load();
  current = fn(current);
  notify();
  const snapshot = JSON.stringify(current);
  writeChain = writeChain.then(() => IndexedDBUtils_set(FoodLogStore_key, snapshot));
  return writeChain;
}

export async function FoodLogStore_replace(log: IFoodLog): Promise<void> {
  return FoodLogStore_update(() => log);
}

export function FoodLogStore_subscribe(listener: IListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useFoodLog(): IFoodLog {
  const [log, setLog] = useState<IFoodLog>(current);
  useEffect(() => {
    const unsubscribe = FoodLogStore_subscribe(setLog);
    FoodLogStore_load().then(setLog);
    return unsubscribe;
  }, []);
  return log;
}

export function FoodLogStore_newId(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}
