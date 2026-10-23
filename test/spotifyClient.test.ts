import "mocha";
import { expect } from "chai";
import sinon from "sinon";
import * as musicStore from "../src/utils/musicStore";
import { SpotifyClient_play } from "../src/utils/spotifyClient";
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
});
