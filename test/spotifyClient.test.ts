import "mocha";
import { expect } from "chai";
import sinon from "sinon";
import * as musicStore from "../src/utils/musicStore";
import {
  SpotifyClient_hasSongsToSave,
  SpotifyClient_play,
  SpotifyClient_refreshMeansSignedOut,
  SpotifyClient_savePlaylist,
} from "../src/utils/spotifyClient";
import { IMusicLog, MusicLog_empty } from "../src/models/musicLog";

const tokenUrl = "https://accounts.spotify.com/api/token";
const playUrl = "https://api.spotify.com/v1/me/player/play";

describe("SpotifyClient token refresh", () => {
  const now = 1_800_000_000_000;
  let log: IMusicLog;
  let fetchStub: sinon.SinonStub;

  function json(body: unknown, status: number): Response {
    return new Response(JSON.stringify(body), { status });
  }

  function authHeaders(): string[] {
    return fetchStub.args.filter(([url]) => url === playUrl).map(([, init]) => init.headers.Authorization);
  }

  beforeEach(() => {
    log = { ...MusicLog_empty(), tokens: { accessToken: "a1", refreshToken: "r1", expiresAt: now + 3600 * 1000 } };
    sinon.stub(Date, "now").returns(now);
    sinon.stub(musicStore, "MusicStore_load").callsFake(async () => log);
    sinon.stub(musicStore, "MusicStore_update").callsFake(async (update: (l: IMusicLog) => IMusicLog) => {
      log = update(log);
    });
    fetchStub = sinon.stub(globalThis, "fetch");
  });
  afterEach(() => sinon.restore());

  it("sends the stored token when it is still valid", async () => {
    fetchStub.resolves(new Response(null, { status: 204 }));
    expect(await SpotifyClient_play(["spotify:track:t1"])).to.deep.equal({ ok: true, value: undefined });
    expect(authHeaders()).to.deep.equal(["Bearer a1"]);
  });

  it("refreshes once after a 401, keeps the refresh token and repeats the call", async () => {
    fetchStub.onCall(0).resolves(new Response(null, { status: 401 }));
    fetchStub.onCall(1).resolves(json({ access_token: "a2", expires_in: 3600 }, 200));
    fetchStub.onCall(2).resolves(new Response(null, { status: 204 }));
    expect(await SpotifyClient_play(["spotify:track:t1"])).to.deep.equal({ ok: true, value: undefined });
    expect(fetchStub.secondCall.args[0]).to.equal(tokenUrl);
    expect(authHeaders()).to.deep.equal(["Bearer a1", "Bearer a2"]);
    expect(log.tokens).to.deep.equal({ accessToken: "a2", refreshToken: "r1", expiresAt: now + 3600 * 1000 });
  });

  it("disconnects when Spotify refuses the refresh token, so only a new login helps", async () => {
    fetchStub.onCall(0).resolves(new Response(null, { status: 401 }));
    fetchStub.onCall(1).resolves(json({ error: "invalid_grant" }, 400));
    expect(await SpotifyClient_play(["spotify:track:t1"])).to.deep.equal({
      ok: false,
      message: "Connect Spotify first.",
    });
    expect(fetchStub.callCount).to.equal(2);
    expect(log.tokens).to.equal(undefined);
  });

  it("keeps the tokens when the refresh fails for another reason", async () => {
    const tokens = log.tokens;
    fetchStub.onCall(0).resolves(new Response(null, { status: 401 }));
    fetchStub.onCall(1).resolves(json({ error: "server_error" }, 503));
    expect(await SpotifyClient_play(["spotify:track:t1"])).to.deep.equal({
      ok: false,
      message: "Connect Spotify first.",
    });
    expect(log.tokens).to.deep.equal(tokens);
  });

  it("refreshes an expiring token before the call and shares one refresh between parallel calls", async () => {
    log = { ...log, tokens: { accessToken: "a1", refreshToken: "r1", expiresAt: now + 30 * 1000 } };
    fetchStub.callsFake(async (url: string) =>
      url === tokenUrl ? json({ access_token: "a2", expires_in: 3600 }, 200) : new Response(null, { status: 204 })
    );
    const results = await Promise.all([SpotifyClient_play(["a"]), SpotifyClient_play(["b"])]);
    expect(results.every((r) => r.ok)).to.equal(true);
    expect(fetchStub.args.filter(([url]) => url === tokenUrl).length).to.equal(1);
    expect(authHeaders()).to.deep.equal(["Bearer a2", "Bearer a2"]);
  });

  it("says no connection when fetch rejects", async () => {
    fetchStub.rejects(new TypeError("Load failed"));
    expect(await SpotifyClient_play(["spotify:track:t1"])).to.deep.equal({
      ok: false,
      message: "Could not reach Spotify. Check the connection and try again.",
    });
  });

  it("keeps the link when the refresh answer is 400 but not invalid_grant", async () => {
    const tokens = log.tokens;
    fetchStub.onCall(0).resolves(new Response(null, { status: 401 }));
    fetchStub.onCall(1).resolves(json({ error: "invalid_client" }, 400));
    await SpotifyClient_play(["spotify:track:t1"]);
    expect(log.tokens).to.deep.equal(tokens);
  });

  it("keeps the link when the refresh answer is 400 with a body that is not JSON", async () => {
    const tokens = log.tokens;
    fetchStub.onCall(0).resolves(new Response(null, { status: 401 }));
    fetchStub.onCall(1).resolves(new Response("<html>bad gateway</html>", { status: 400 }));
    await SpotifyClient_play(["spotify:track:t1"]);
    expect(log.tokens).to.deep.equal(tokens);
  });

  it("keeps the link when the refresh call times out or loses the network", async () => {
    const tokens = log.tokens;
    fetchStub.onCall(0).resolves(new Response(null, { status: 401 }));
    fetchStub.onCall(1).rejects(new TypeError("Load failed"));
    expect((await SpotifyClient_play(["spotify:track:t1"])).ok).to.equal(false);
    expect(log.tokens).to.deep.equal(tokens);
  });
});

describe("SpotifyClient_refreshMeansSignedOut", () => {
  it("is true only for a 400 with invalid_grant", () => {
    expect(SpotifyClient_refreshMeansSignedOut(400, { error: "invalid_grant" })).to.equal(true);
    expect(SpotifyClient_refreshMeansSignedOut(400, { error: "invalid_client" })).to.equal(false);
    expect(SpotifyClient_refreshMeansSignedOut(400, undefined)).to.equal(false);
    expect(SpotifyClient_refreshMeansSignedOut(400, null)).to.equal(false);
    expect(SpotifyClient_refreshMeansSignedOut(500, { error: "invalid_grant" })).to.equal(false);
    expect(SpotifyClient_refreshMeansSignedOut(503, {})).to.equal(false);
  });
});

describe("SpotifyClient_savePlaylist", () => {
  const now = 1_800_000_000_000;
  let fetchStub: sinon.SinonStub;

  function json(body: unknown, status: number): Response {
    return new Response(JSON.stringify(body), { status });
  }

  function callsTo(suffix: string): number {
    return fetchStub.args.filter(([url]) => String(url).endsWith(suffix)).length;
  }

  beforeEach(() => {
    const log = {
      ...MusicLog_empty(),
      tokens: { accessToken: "a1", refreshToken: "r1", expiresAt: now + 3600 * 1000 },
    };
    sinon.stub(Date, "now").returns(now);
    sinon.stub(musicStore, "MusicStore_load").callsFake(async () => log);
    sinon.stub(musicStore, "MusicStore_update").resolves();
    fetchStub = sinon.stub(globalThis, "fetch");
  });
  afterEach(() => sinon.restore());

  it("has songs to save only when the list is not empty", () => {
    expect(SpotifyClient_hasSongsToSave([])).to.equal(false);
    expect(SpotifyClient_hasSongsToSave(["spotify:track:t1"])).to.equal(true);
  });

  it("never creates a playlist when there are no songs", async () => {
    const result = await SpotifyClient_savePlaylist("Workout", []);
    expect(result.ok).to.equal(false);
    expect(fetchStub.callCount).to.equal(0);
  });

  it("creates the playlist and adds the songs", async () => {
    fetchStub.callsFake(async (url: string) =>
      url.endsWith("/me/playlists") ? json({ id: "p1" }, 201) : json({ snapshot_id: "s" }, 201)
    );
    expect(await SpotifyClient_savePlaylist("Workout", ["spotify:track:t1"])).to.deep.equal({
      ok: true,
      value: { id: "p1" },
    });
    expect(callsTo("/playlists/p1/items")).to.equal(1);
  });

  it("returns the created playlist when adding songs fails, and the retry does not create another", async () => {
    fetchStub.callsFake(async (url: string) =>
      url.endsWith("/me/playlists") ? json({ id: "p1" }, 201) : json({ error: {} }, 500)
    );
    const first = await SpotifyClient_savePlaylist("Workout", ["spotify:track:t1"]);
    expect(first.ok).to.equal(false);
    const created = first.ok ? undefined : first.created;
    expect(created).to.deep.equal({ id: "p1" });
    expect(callsTo("/me/playlists")).to.equal(1);

    fetchStub.resetHistory();
    fetchStub.callsFake(async () => json({ snapshot_id: "s" }, 201));
    const retry = await SpotifyClient_savePlaylist("Workout", ["spotify:track:t1"], created);
    expect(retry).to.deep.equal({ ok: true, value: { id: "p1" } });
    expect(callsTo("/me/playlists")).to.equal(0);
    expect(callsTo("/playlists/p1/items")).to.equal(1);
  });

  it("falls back to /tracks when /items answers 404", async () => {
    fetchStub.callsFake(async (url: string) => {
      if (url.endsWith("/me/playlists")) {
        return json({ id: "p1" }, 201);
      }
      return url.endsWith("/items") ? json({}, 404) : json({ snapshot_id: "s" }, 201);
    });
    expect((await SpotifyClient_savePlaylist("Workout", ["spotify:track:t1"])).ok).to.equal(true);
    expect(callsTo("/playlists/p1/tracks")).to.equal(1);
  });
});
