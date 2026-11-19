import { useEffect, useState } from "react";
import {
  IMusicLog,
  IMusicSecureRead,
  MusicLog_dropMovedTokens,
  MusicLog_empty,
  MusicLog_forPlainStore,
  MusicLog_markLinked,
  MusicLog_parse,
  MusicLog_signedOut,
  MusicLog_tokenMove,
  MusicLog_tokenStart,
  MusicLog_withTokens,
} from "../models/musicLog";
import { ISpotifyTokens, SpotifyAuth_parseTokensRecord } from "../models/spotifyAuth";
import { JsonStore_create } from "./jsonStore";
import { SecureStore_get, SecureStore_isAvailable, SecureStore_remove, SecureStore_set } from "./secureStore";

const MusicStore_key = "bebear_music";
const MusicStore_secureName = "spotify";

const store = JsonStore_create(MusicStore_key, MusicLog_parse, MusicLog_empty);

let secureTokens: ISpotifyTokens | undefined;
let isKnown = !SecureStore_isAvailable;
let ready: Promise<void> | undefined;
let keychainChain: Promise<void> = Promise.resolve();

function inKeychainOrder(step: () => Promise<void>): Promise<void> {
  keychainChain = keychainChain.then(step, step);
  return keychainChain;
}

async function readSecure(): Promise<IMusicSecureRead> {
  if (!SecureStore_isAvailable) {
    return { ok: true };
  }
  let text: string | undefined;
  try {
    text = await SecureStore_get(MusicStore_secureName);
  } catch {
    return { ok: false };
  }
  try {
    return { ok: true, tokens: text == null ? undefined : SpotifyAuth_parseTokensRecord(JSON.parse(text)) };
  } catch {
    return { ok: true };
  }
}

// Each run reads the plain store again, so only the newest token reaches the Keychain.
// A failed copy leaves the token in the plain store, and the next start or token write tries again.
function moveTokens(): Promise<void> {
  return inKeychainOrder(async () => {
    const move = MusicLog_tokenMove((await store.load()).tokens, secureTokens, SecureStore_isAvailable);
    const copied = move.copyToSecure;
    if (copied == null) {
      return;
    }
    try {
      await store.update((log) => MusicLog_markLinked(log, copied));
      await SecureStore_set(MusicStore_secureName, JSON.stringify(copied));
      const readBack = await readSecure();
      if (!readBack.ok) {
        return;
      }
      secureTokens = readBack.tokens;
      await store.update((log) => MusicLog_dropMovedTokens(log, copied, readBack.tokens));
    } catch {
      return;
    }
  });
}

function removeSecure(): Promise<void> {
  return inKeychainOrder(() => SecureStore_remove(MusicStore_secureName).catch(() => undefined));
}

// A plain store that cannot be read counts as a failed read, so its missing marker never deletes the Keychain token.
async function start(): Promise<void> {
  const read = await readSecure();
  const log = read.ok ? await store.loadStrict().catch(() => undefined) : undefined;
  const step = MusicLog_tokenStart(log ?? MusicLog_empty(), log != null ? read : { ok: false });
  isKnown = step.isKnown;
  secureTokens = step.secure;
  if (!step.isKnown) {
    ready = undefined;
    return;
  }
  if (step.clearMarker) {
    await store.update((saved) => MusicLog_forPlainStore(saved, undefined, true)).catch(() => undefined);
  }
  if (step.deleteSecure) {
    await removeSecure();
  }
  await moveTokens();
}

function ensureReady(): Promise<void> {
  if (ready == null) {
    ready = start();
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
    return MusicLog_forPlainStore(next, secureTokens, isKnown);
  });
  if (signedOut) {
    await removeSecure();
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
