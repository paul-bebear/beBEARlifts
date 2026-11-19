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
  MusicLog_exportJson,
  MusicLog_forPlainStore,
  MusicLog_markLinked,
  MusicLog_sameTokens,
  MusicLog_signedOut,
  MusicLog_tokenMove,
  MusicLog_tokenStart,
  MusicLog_withTokens,
} from "../src/models/musicLog";
import { FullBackup_keepSpotifyLogin } from "../src/models/fullBackup";

const old = { accessToken: "test-access-1", refreshToken: "test-refresh-1", expiresAt: 1000 };
const fresh = { accessToken: "test-access-2", refreshToken: "test-refresh-1", expiresAt: 2000 };
const fresh2 = { accessToken: "test-access-3", refreshToken: "test-refresh-2", expiresAt: 3000 };

function withTokens(tokens = old, spotifyLinked?: true): IMusicLog {
  const sessions = [{ id: 1, startedAt: 5, plays: [] }];
  return { ...MusicLog_empty(), displayName: "Bear", tokens, spotifyLinked, sessions };
}

function linked(): IMusicLog {
  return { ...withTokens(old, true), tokens: undefined };
}

function unlinked(): IMusicLog {
  return { ...withTokens(), tokens: undefined };
}

describe("MusicLog_tokenStart", () => {
  const none = { isKnown: true, deleteSecure: false, clearMarker: false };

  it("treats an old app store with a plain token and no marker as linked", () => {
    expect(MusicLog_tokenStart(withTokens(), { ok: true })).to.deep.equal({ ...none, secure: undefined });
  });

  it("uses the Keychain token while the marker is set", () => {
    expect(MusicLog_tokenStart(linked(), { ok: true, tokens: old })).to.deep.equal({ ...none, secure: old });
  });

  it("ignores and deletes a Keychain token without the marker, as after a reinstall", () => {
    expect(MusicLog_tokenStart(unlinked(), { ok: true, tokens: old })).to.deep.equal({ ...none, deleteSecure: true });
    expect(MusicLog_tokenStart(MusicLog_empty(), { ok: true, tokens: old }).deleteSecure).to.equal(true);
  });

  it("clears a marker that has no token anywhere", () => {
    expect(MusicLog_tokenStart(linked(), { ok: true })).to.deep.equal({ ...none, clearMarker: true });
  });

  it("decides nothing after a failed Keychain read", () => {
    const step = MusicLog_tokenStart(unlinked(), { ok: false });
    expect(step).to.deep.equal({ isKnown: false, deleteSecure: false, clearMarker: false });
    expect(MusicLog_tokenStart(linked(), { ok: false }).clearMarker).to.equal(false);
  });
});

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

describe("MusicLog_markLinked and MusicLog_dropMovedTokens", () => {
  it("sets the marker next to the old app's token before the copy", () => {
    const next = MusicLog_markLinked(withTokens(), old);
    expect(next.spotifyLinked).to.equal(true);
    expect(next.tokens).to.deep.equal(old);
    const marked = withTokens(old, true);
    expect(MusicLog_markLinked(marked, old)).to.equal(marked);
    expect(MusicLog_markLinked(withTokens(fresh), old).spotifyLinked).to.equal(undefined);
  });

  it("removes the plain token only after the Keychain reads back the same one", () => {
    const next = MusicLog_dropMovedTokens(withTokens(old, true), old, { ...old });
    expect(next.tokens).to.equal(undefined);
    expect(next.spotifyLinked).to.equal(true);
    expect(next.displayName).to.equal("Bear");
    expect(next.sessions).to.deep.equal(withTokens().sessions);
  });

  it("keeps the plain token when the Keychain read fails or differs, or the marker is missing", () => {
    const log = withTokens(old, true);
    expect(MusicLog_dropMovedTokens(log, old, undefined)).to.equal(log);
    expect(MusicLog_dropMovedTokens(log, old, fresh)).to.equal(log);
    const unmarked = withTokens();
    expect(MusicLog_dropMovedTokens(unmarked, old, old)).to.equal(unmarked);
  });

  it("keeps a token that a refresh wrote during the copy", () => {
    const log = withTokens(fresh, true);
    expect(MusicLog_dropMovedTokens(log, old, old)).to.equal(log);
  });
});

describe("MusicLog token view", () => {
  it("shows the Keychain token only while the marker is set", () => {
    expect(MusicLog_withTokens(linked(), old).tokens).to.deep.equal(old);
    expect(MusicLog_withTokens(unlinked(), old).tokens).to.equal(undefined);
    expect(MusicLog_withTokens(linked(), undefined).tokens).to.equal(undefined);
    expect(MusicLog_withTokens(withTokens(fresh, true), old).tokens).to.deep.equal(fresh);
  });

  it("writes a token already in the Keychain without it, and with the marker, to the plain store", () => {
    const next = MusicLog_forPlainStore(withTokens(), old, true);
    expect(next.tokens).to.equal(undefined);
    expect(next.spotifyLinked).to.equal(true);
    expect(MusicLog_forPlainStore(withTokens(fresh), old, true).tokens).to.deep.equal(fresh);
    expect(MusicLog_forPlainStore(withTokens(), undefined, true).tokens).to.deep.equal(old);
  });

  it("drops the marker with the token, but keeps it while the Keychain is unread", () => {
    expect(MusicLog_forPlainStore(linked(), undefined, true).spotifyLinked).to.equal(undefined);
    expect(MusicLog_forPlainStore(linked(), undefined, false).spotifyLinked).to.equal(true);
    expect(MusicLog_forPlainStore(MusicLog_disconnect(withTokens(old, true)), undefined, false).spotifyLinked).to.equal(
      undefined
    );
  });

  it("does not carry a backup's marker to a phone that is not linked", () => {
    const restored = FullBackup_keepSpotifyLogin(linked(), unlinked());
    expect(MusicLog_forPlainStore(restored, undefined, true).spotifyLinked).to.equal(undefined);
    expect(JSON.parse(MusicLog_exportJson(withTokens(old, true)))).to.not.have.property("spotifyLinked");
  });

  it("sees a sign-out when an update removes the token", () => {
    expect(MusicLog_signedOut(withTokens(), unlinked())).to.equal(true);
    expect(MusicLog_signedOut(withTokens(), withTokens(fresh))).to.equal(false);
    expect(MusicLog_signedOut(unlinked(), unlinked())).to.equal(false);
    expect(MusicLog_disconnect(withTokens(old, true)).spotifyLinked).to.equal(undefined);
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
    if (secureStore.SecureStore_isAvailable !== isAvailable) {
      sinon.replace(secureStore, "SecureStore_isAvailable", isAvailable);
    }
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
  it("keeps the user signed out when the Keychain delete failed", async () => {
    startApp(true);
    await musicStore.MusicStore_load();
    (secureStore.SecureStore_remove as sinon.SinonStub).rejects(new Error("Keychain delete failed"));
    await musicStore.MusicStore_update(MusicLog_disconnect);
    expect(keychain.has("spotify")).to.equal(true);
    (secureStore.SecureStore_remove as sinon.SinonStub).callsFake(async (name: string) => {
      keychain.delete(name);
    });
    startApp(true);
    expect((await musicStore.MusicStore_load()).tokens).to.equal(undefined);
    expect(keychain.has("spotify")).to.equal(false);
  });

  it("ignores a Keychain token left from an earlier install", async () => {
    disk.delete("bebear_music");
    keychain.set("spotify", JSON.stringify(old));
    startApp(true);
    expect((await musicStore.MusicStore_load()).tokens).to.equal(undefined);
    expect(keychain.has("spotify")).to.equal(false);
  });

  it("reads the Keychain again after a failed read and deletes nothing", async () => {
    disk.set("bebear_music", JSON.stringify(linked()));
    keychain.set("spotify", JSON.stringify(old));
    const get = secureStore.SecureStore_get as sinon.SinonStub;
    get.onFirstCall().rejects(new Error("Device locked"));
    startApp(true);
    expect((await musicStore.MusicStore_load()).tokens).to.equal(undefined);
    await musicStore.MusicStore_update((log) => ({ ...log, displayName: "Cub" }));
    expect(plain().spotifyLinked).to.equal(true);
    expect(keychain.has("spotify")).to.equal(true);
    expect((await musicStore.MusicStore_load()).tokens).to.deep.equal(old);
  });

  it("writes only the newest token when two refreshes overlap", async () => {
    startApp(true);
    await musicStore.MusicStore_load();
    await Promise.all([
      musicStore.MusicStore_update((log) => ({ ...log, tokens: fresh })),
      musicStore.MusicStore_update((log) => ({ ...log, tokens: fresh2 })),
    ]);
    expect(JSON.parse(keychain.get("spotify")!)).to.deep.equal(fresh2);
    expect(plain()).to.not.have.property("tokens");
    expect((await musicStore.MusicStore_load()).tokens).to.deep.equal(fresh2);
  });
});
