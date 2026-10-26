import { useEffect, useState } from "react";
import { IndexedDBUtils_get, IndexedDBUtils_setMany } from "./indexeddb";
import { Dialog_alert, Dialog_choice } from "./dialog";
import { StoreRecovery_choice, StoreRecovery_prompt, StoreRecovery_readError } from "../models/storeRecovery";

export interface IJsonStore<T> {
  load: () => Promise<T>;
  // A backup must not upload the empty value that load() falls back to when the read fails.
  loadStrict: () => Promise<T>;
  get: () => T;
  subscribe: (listener: (value: T) => void) => () => void;
  update: (fn: (value: T) => T) => Promise<void>;
  replace: (value: T) => Promise<void>;
  use: () => T;
}

export interface IJsonStoreRecovery {
  isSignedIn: () => Promise<boolean>;
  restoreFromCloud: () => void;
}

let recovery: IJsonStoreRecovery | undefined;

// The cloud restore lives above this layer, so the app hands it in at launch.
export function JsonStore_setRecovery(value: IJsonStoreRecovery | undefined): void {
  recovery = value;
}

class UnreadableError extends Error {
  constructor() {
    super(StoreRecovery_readError);
  }
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
  let offeredRecovery = false;
  const listeners = new Set<(value: T) => void>();

  function notify(): void {
    for (const listener of listeners) {
      listener(current);
    }
  }

  async function read(): Promise<T> {
    let raw: unknown;
    try {
      raw = await IndexedDBUtils_get(key, true);
    } catch {
      throw new Error(StoreRecovery_readError);
    }
    let parsed: unknown;
    try {
      parsed = typeof raw === "string" ? JSON.parse(raw) : undefined;
    } catch {
      try {
        await persist(`${key}_unreadable`, raw as string);
      } catch {
        throw new Error(StoreRecovery_readError);
      }
      throw new UnreadableError();
    }
    try {
      return parse(parsed);
    } catch {
      throw new Error(StoreRecovery_readError);
    }
  }

  async function offerRecovery(): Promise<void> {
    offeredRecovery = true;
    const signedIn = recovery != null && (await recovery.isSignedIn().catch(() => false));
    const prompt = StoreRecovery_prompt(key, signedIn);
    const choice = StoreRecovery_choice(prompt, await Dialog_choice(prompt.title, prompt.message, prompt.options));
    if (choice === "restore") {
      recovery?.restoreFromCloud();
    } else if (choice === "reset") {
      await replace(empty()).catch(() => undefined);
    }
  }

  function reportReadError(error: unknown): void {
    if (error instanceof UnreadableError) {
      offerRecovery().catch(() => undefined);
    } else {
      Dialog_alert(StoreRecovery_readError);
    }
  }

  function loadStrict(): Promise<T> {
    return writeChain
      .catch(() => undefined)
      .then(async () => {
        current = await read();
        loadPromise = Promise.resolve();
        notify();
        return current;
      });
  }

  function load(): Promise<T> {
    if (loadPromise == null) {
      loadPromise = writeChain
        .catch(() => undefined)
        .then(async () => {
          current = await read();
          notify();
        })
        .catch((error) => {
          loadPromise = undefined;
          if (error instanceof UnreadableError && !offeredRecovery) {
            reportReadError(error);
          }
        });
    }
    return loadPromise.then(() => current);
  }

  function write(next: T): Promise<void> {
    return persist(key, JSON.stringify(next)).then(() => {
      current = next;
      loadPromise = Promise.resolve();
      notify();
    });
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
          reportReadError(error);
          throw error;
        }
        const next = fn(saved);
        if (next !== saved) {
          await write(next);
          return;
        }
        current = next;
        loadPromise = Promise.resolve();
        notify();
      });
    return writeChain;
  }

  // Writes without reading first, so a restore or "Start this log again" works on a store that cannot be parsed.
  function replace(value: T): Promise<void> {
    writeChain = writeChain.catch(() => undefined).then(() => write(value));
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

  return { load, loadStrict, get: () => current, subscribe, update, replace, use };
}
