import "mocha";
import { expect } from "chai";
import sinon from "sinon";
import * as indexeddb from "../src/utils/indexeddb";
import * as secureStore from "../src/utils/secureStore";
import {
  IMusicLog,
  MusicLog_disconnect,
  MusicLog_dropMovedTokens,
  MusicLog_empty,
  MusicLog_forPlainStore,
  MusicLog_sameTokens,
  MusicLog_signedOut,
  MusicLog_tokenMove,
  MusicLog_withTokens,
} from "../src/models/musicLog";

const old = { accessToken: "test-access-1", refreshToken: "test-refresh-1", expiresAt: 1000 };
const fresh = { accessToken: "test-access-2", refreshToken: "test-refresh-1", expiresAt: 2000 };
const fresh2 = { accessToken: "test-access-3", refreshToken: "test-refresh-2", expiresAt: 3000 };

function withTokens(tokens = old): IMusicLog {
  return { ...MusicLog_empty(), displayName: "Bear", tokens, sessions: [{ id: 1, startedAt: 5, plays: [] }] };
}

describe("MusicLog_tokenMove", () => {
  it("copies a token from the plain store to the Keychain on the iPhone", () => {
    expect(MusicLog_tokenMove(old, undefined, true)).to.deep.equal({ tokens: old, copyToSecure: old });
  });

  it("keeps the newer plain token over an older Keychain one", () => {
    expect(MusicLog_tokenMove(fresh, old, true)).to.deep.equal({ tokens: fresh, copyToSecure: fresh });
  });

  it("uses the Keychain token when the plain store has none", () => {
    expect(MusicLog_tokenMove(undefined, old, true)).to.deep.equal({ tokens: old });
  });

  it("leaves the web on the plain store", () => {
    expect(MusicLog_tokenMove(old, undefined, false)).to.deep.equal({ tokens: old });
  });

  it("does nothing when the user has no Spotify link", () => {
    expect(MusicLog_tokenMove(undefined, undefined, true)).to.deep.equal({ tokens: undefined });
  });
});

describe("MusicLog_dropMovedTokens", () => {
  it("removes the plain token only after the Keychain reads back the same one", () => {
    const next = MusicLog_dropMovedTokens(withTokens(), old, { ...old });
    expect(next.tokens).to.equal(undefined);
    expect(next.displayName).to.equal("Bear");
    expect(next.sessions).to.deep.equal(withTokens().sessions);
  });

  it("keeps the plain token when the Keychain read fails or differs", () => {
    const log = withTokens();
    expect(MusicLog_dropMovedTokens(log, old, undefined)).to.equal(log);
    expect(MusicLog_dropMovedTokens(log, old, fresh)).to.equal(log);
  });

  it("keeps a token that a refresh wrote during the copy", () => {
    const log = withTokens(fresh);
    expect(MusicLog_dropMovedTokens(log, old, old)).to.equal(log);
  });
});

describe("MusicLog token view", () => {
  it("shows the Keychain token in a log that has none", () => {
    const log = { ...withTokens(), tokens: undefined };
    expect(MusicLog_withTokens(log, old).tokens).to.deep.equal(old);
    expect(MusicLog_withTokens(log, undefined)).to.equal(log);
    expect(MusicLog_withTokens(withTokens(fresh), old).tokens).to.deep.equal(fresh);
  });

  it("writes a token already in the Keychain without it to the plain store", () => {
    expect(MusicLog_forPlainStore(withTokens(), old).tokens).to.equal(undefined);
    expect(MusicLog_forPlainStore(withTokens(fresh), old).tokens).to.deep.equal(fresh);
    expect(MusicLog_forPlainStore(withTokens(), undefined).tokens).to.deep.equal(old);
  });

  it("sees a sign-out when an update removes the token", () => {
    const out = { ...withTokens(), tokens: undefined };
    expect(MusicLog_signedOut(withTokens(), out)).to.equal(true);
    expect(MusicLog_signedOut(withTokens(), withTokens(fresh))).to.equal(false);
    expect(MusicLog_signedOut(out, out)).to.equal(false);
  });

  it("compares tokens by every field", () => {
    expect(MusicLog_sameTokens(old, { ...old })).to.equal(true);
    expect(MusicLog_sameTokens(old, fresh)).to.equal(false);
    expect(MusicLog_sameTokens(undefined, undefined)).to.equal(true);
    expect(MusicLog_sameTokens(old, undefined)).to.equal(false);
  });
});

describe("MusicStore with the Keychain", () => {
  let disk: Map<string, string | undefined>;
  let keychain: Map<string, string>;
  let failWrite: boolean;
  let musicStore: typeof import("../src/utils/musicStore");

  function plain(): Record<string, unknown> {
    return JSON.parse(disk.get("bebear_music") ?? "{}");
  }

  function startApp(isAvailable: boolean): void {
    sinon.replace(secureStore, "SecureStore_isAvailable", isAvailable);
    delete require.cache[require.resolve("../src/utils/musicStore")];
    musicStore = require("../src/utils/musicStore");
  }

  beforeEach(() => {
    disk = new Map([["bebear_music", JSON.stringify(withTokens())]]);
    keychain = new Map();
    failWrite = false;
    sinon.stub(indexeddb, "IndexedDBUtils_get").callsFake(async (key) => disk.get(key));
    sinon.stub(indexeddb, "IndexedDBUtils_setMany").callsFake(async (pairs) => {
      pairs.forEach(([key, value]) => disk.set(key, value));
    });
    sinon.stub(secureStore, "SecureStore_get").callsFake(async (name) => keychain.get(name));
    sinon.stub(secureStore, "SecureStore_set").callsFake(async (name, value) => {
      if (failWrite) {
        throw new Error("Keychain write failed");
      }
      keychain.set(name, value);
    });
    sinon.stub(secureStore, "SecureStore_remove").callsFake(async (name) => {
      keychain.delete(name);
    });
  });
  afterEach(() => sinon.restore());

  it("moves a linked user's token to the Keychain and keeps the music log", async () => {
    startApp(true);
    const log = await musicStore.MusicStore_load();
    expect(log.tokens).to.deep.equal(old);
    expect(JSON.parse(keychain.get("spotify")!)).to.deep.equal(old);
    expect(plain()).to.not.have.property("tokens");
    expect(plain().sessions).to.deep.equal(withTokens().sessions);
    expect(plain().displayName).to.equal("Bear");
  });

  it("keeps the token in the plain store when the Keychain write fails", async () => {
    failWrite = true;
    startApp(true);
    expect((await musicStore.MusicStore_load()).tokens).to.deep.equal(old);
    expect(plain().tokens).to.deep.equal(old);
  });

  it("puts a refreshed token in the Keychain, not the plain store", async () => {
    startApp(true);
    await musicStore.MusicStore_update((log) => ({ ...log, tokens: fresh2 }));
    expect(JSON.parse(keychain.get("spotify")!)).to.deep.equal(fresh2);
    expect(plain()).to.not.have.property("tokens");
    await musicStore.MusicStore_update((log) => ({ ...log, displayName: "Cub" }));
    expect(plain()).to.not.have.property("tokens");
    expect((await musicStore.MusicStore_load()).tokens).to.deep.equal(fresh2);
  });

  it("signs out of both places", async () => {
    startApp(true);
    await musicStore.MusicStore_load();
    await musicStore.MusicStore_update(MusicLog_disconnect);
    expect(keychain.has("spotify")).to.equal(false);
    expect(plain()).to.not.have.property("tokens");
    expect((await musicStore.MusicStore_load()).tokens).to.equal(undefined);
  });

  it("leaves the web token where it is", async () => {
    startApp(false);
    expect((await musicStore.MusicStore_load()).tokens).to.deep.equal(old);
    expect(plain().tokens).to.deep.equal(old);
    expect(keychain.size).to.equal(0);
  });
});
