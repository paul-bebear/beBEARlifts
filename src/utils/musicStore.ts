import { useEffect, useState } from "react";
import {
  IMusicLog,
  MusicLog_dropMovedTokens,
  MusicLog_empty,
  MusicLog_forPlainStore,
  MusicLog_parse,
  MusicLog_signedOut,
  MusicLog_tokenMove,
  MusicLog_withTokens,
} from "../models/musicLog";
import { ISpotifyTokens, SpotifyAuth_parseTokensRecord } from "../models/spotifyAuth";
import { JsonStore_create } from "./jsonStore";
import { SecureStore_get, SecureStore_isAvailable, SecureStore_remove, SecureStore_set } from "./secureStore";

const MusicStore_key = "bebear_music";
const MusicStore_secureName = "spotify";

const store = JsonStore_create(MusicStore_key, MusicLog_parse, MusicLog_empty);

let secureTokens: ISpotifyTokens | undefined;
let ready: Promise<void> | undefined;

async function readSecure(): Promise<ISpotifyTokens | undefined> {
  const text = await SecureStore_get(MusicStore_secureName);
  return text == null ? undefined : SpotifyAuth_parseTokensRecord(JSON.parse(text));
}

// A failed copy leaves the token in the plain store, and the next start or token write tries again.
async function moveTokens(): Promise<void> {
  const move = MusicLog_tokenMove((await store.load()).tokens, secureTokens, SecureStore_isAvailable);
  const copied = move.copyToSecure;
  if (copied == null) {
    return;
  }
  try {
    await SecureStore_set(MusicStore_secureName, JSON.stringify(copied));
    const readBack = await readSecure();
    secureTokens = readBack;
    await store.update((log) => MusicLog_dropMovedTokens(log, copied, readBack));
  } catch {
    return;
  }
}

function ensureReady(): Promise<void> {
  if (ready == null) {
    ready = (async () => {
      if (SecureStore_isAvailable) {
        secureTokens = await readSecure().catch(() => undefined);
      }
      await moveTokens();
    })();
  }
  return ready;
}

export async function MusicStore_load(): Promise<IMusicLog> {
  await ensureReady();
  return MusicLog_withTokens(await store.load(), secureTokens);
}

export async function MusicStore_loadStrict(): Promise<IMusicLog> {
  await ensureReady();
  return MusicLog_withTokens(await store.loadStrict(), secureTokens);
}

export async function MusicStore_update(fn: (log: IMusicLog) => IMusicLog): Promise<void> {
  await ensureReady();
  let signedOut = false;
  await store.update((saved) => {
    const before = MusicLog_withTokens(saved, secureTokens);
    const next = fn(before);
    if (next === before) {
      return saved;
    }
    signedOut = MusicLog_signedOut(before, next);
    if (signedOut) {
      secureTokens = undefined;
    }
    return MusicLog_forPlainStore(next, secureTokens);
  });
  if (signedOut) {
    await SecureStore_remove(MusicStore_secureName).catch(() => undefined);
    return;
  }
  await moveTokens();
}

// Every change to the Keychain token is followed by a plain store write, which draws the screen again.
export function useMusicLog(): IMusicLog {
  const log = store.use();
  const [, setReady] = useState(false);
  useEffect(() => {
    ensureReady().then(() => setReady(true));
  }, []);
  return MusicLog_withTokens(log, secureTokens);
}
