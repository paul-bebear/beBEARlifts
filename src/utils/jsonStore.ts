import { useEffect, useState } from "react";
import { IndexedDBUtils_get, IndexedDBUtils_set } from "./indexeddb";

export interface IJsonStore<T> {
  load: () => Promise<T>;
  update: (fn: (value: T) => T) => Promise<void>;
  use: () => T;
}

// One IndexedDB key holding one JSON value, with listeners so every screen shows the same copy.
export function JsonStore_create<T>(key: string, parse: (raw: unknown) => T, empty: () => T): IJsonStore<T> {
  let current = empty();
  let loadPromise: Promise<void> | undefined;
  let writeChain: Promise<void> = Promise.resolve();
  const listeners = new Set<(value: T) => void>();

  function notify(): void {
    for (const listener of listeners) {
      listener(current);
    }
  }

  function load(): Promise<T> {
    if (loadPromise == null) {
      loadPromise = IndexedDBUtils_get(key)
        .then((raw) => {
          current = parse(typeof raw === "string" ? JSON.parse(raw) : undefined);
          notify();
        })
        .catch(() => undefined);
    }
    return loadPromise.then(() => current);
  }

  async function update(fn: (value: T) => T): Promise<void> {
    await load();
    current = fn(current);
    notify();
    const snapshot = JSON.stringify(current);
    writeChain = writeChain.then(() => IndexedDBUtils_set(key, snapshot));
    return writeChain;
  }

  function use(): T {
    const [value, setValue] = useState<T>(current);
    useEffect(() => {
      listeners.add(setValue);
      load().then(setValue);
      return () => {
        listeners.delete(setValue);
      };
    }, []);
    return value;
  }

  return { load, update, use };
}
