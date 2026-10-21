import { useEffect, useState } from "react";
import { IndexedDBUtils_get, IndexedDBUtils_setMany } from "./indexeddb";
import { Dialog_alert } from "./dialog";

export interface IJsonStore<T> {
  load: () => Promise<T>;
  get: () => T;
  subscribe: (listener: (value: T) => void) => () => void;
  update: (fn: (value: T) => T) => Promise<void>;
  use: () => T;
}

async function persistValue(key: string, value?: string): Promise<void> {
  try {
    await IndexedDBUtils_setMany([[key, value]]);
  } catch (error) {
    Dialog_alert("Could not save data. The phone may be out of space. Try again.");
    throw error;
  }
}

export function JsonStore_create<T>(
  key: string,
  parse: (raw: unknown) => T,
  empty: () => T,
  persist: (storeKey: string, value?: string) => Promise<void> = persistValue
): IJsonStore<T> {
  let current = empty();
  let loadPromise: Promise<void> | undefined;
  let writeChain: Promise<void> = Promise.resolve();
  const listeners = new Set<(value: T) => void>();

  function notify(): void {
    for (const listener of listeners) {
      listener(current);
    }
  }

  async function read(): Promise<T> {
    try {
      const raw = await IndexedDBUtils_get(key, true);
      let parsed: unknown;
      try {
        parsed = typeof raw === "string" ? JSON.parse(raw) : undefined;
      } catch (error) {
        await persist(`${key}_unreadable`, raw as string);
        throw error;
      }
      return parse(parsed);
    } catch {
      throw new Error("Could not read saved data");
    }
  }

  function load(): Promise<T> {
    if (loadPromise == null) {
      loadPromise = writeChain
        .catch(() => undefined)
        .then(async () => {
          current = await read();
          notify();
        })
        .catch(() => {
          loadPromise = undefined;
        });
    }
    return loadPromise.then(() => current);
  }

  function update(fn: (value: T) => T): Promise<void> {
    writeChain = writeChain
      .catch(() => undefined)
      .then(async () => {
        let saved: T;
        try {
          saved = await read();
        } catch (error) {
          loadPromise = undefined;
          Dialog_alert("Could not read saved data");
          throw error;
        }
        const next = fn(saved);
        if (next !== saved) {
          await persist(key, JSON.stringify(next));
        }
        current = next;
        loadPromise = Promise.resolve();
        notify();
      });
    return writeChain;
  }

  function subscribe(listener: (value: T) => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  }

  function use(): T {
    const [value, setValue] = useState<T>(current);
    useEffect(() => {
      const unsubscribe = subscribe(setValue);
      load().then(setValue);
      return unsubscribe;
    }, []);
    return value;
  }

  return { load, get: () => current, subscribe, update, use };
}
