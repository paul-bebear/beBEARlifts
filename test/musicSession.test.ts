import "mocha";
import { expect } from "chai";
import sinon from "sinon";
import * as musicStore from "../src/utils/musicStore";
import {
  SpotifyClient_handleRedirect,
  SpotifyClient_takeCameBackFromLogin,
  SpotifyClient_takeError,
  SpotifyClient_testerLimitMessage,
} from "../src/utils/spotifyClient";
import { ListenLinks_normalize, ListenLinks_spotifyUri } from "../src/models/listenLinks";
import {
  IMusicPlay,
  MusicSession_counts,
  MusicSession_dropCopies,
  MusicSession_finish,
  MusicSession_isKept,
  MusicSession_keptTracks,
  MusicSession_mergeHistory,
  MusicSession_observe,
  MusicSession_setKept,
  MusicSession_start,
} from "../src/models/musicSession";
import { MusicLog_empty, MusicLog_exportJson, MusicLog_parse, MusicLog_putSession } from "../src/models/musicLog";
import { ISpotifyTrack, SpotifyTracks_parseHistory, SpotifyTracks_parseNowPlaying } from "../src/models/spotifyTracks";
import {
  SpotifyAuth_authorizeUrl,
  SpotifyAuth_cleanUrl,
  SpotifyAuth_needsRefresh,
  SpotifyAuth_parseTokens,
  SpotifyAuth_readRedirect,
} from "../src/models/spotifyAuth";

function track(id: string, durationMs: number = 200000): ISpotifyTrack {
  return { id, uri: `spotify:track:${id}`, name: `Song ${id}`, artists: "Artist", durationMs };
}

function playing(
  t: ISpotifyTrack,
  progressMs: number
): { track: ISpotifyTrack; progressMs: number; isPlaying: boolean } {
  return { track: t, progressMs, isPlaying: true };
}

const t0 = 1_000_000;

describe("MusicSession", () => {
  it("keeps the song playing before lock and sorts it before songs recovered from history", () => {
    const a = track("a", 240000);
    const b = track("b", 240000);
    const history = [
      { track: a, startedAt: t0, endedAt: t0 + 240000 },
      { track: b, startedAt: t0 + 240000, endedAt: t0 + 480000 },
    ];
    let s = MusicSession_observe(MusicSession_start(1, t0), playing(a, 30000), t0 + 30000);
    s = MusicSession_mergeHistory(s, history, t0 + 500000);
    expect(s.current?.maxProgressMs).to.equal(240000);
    s = MusicSession_observe(s, playing(track("c"), 20000), t0 + 500000);
    expect(s.plays.map((p) => [p.track.id, p.heardMs, p.isKept])).to.deep.equal([
      ["a", 240000, true],
      ["b", 240000, true],
    ]);
    s = MusicSession_mergeHistory(s, history, t0 + 500000);
    s = MusicSession_finish(s, t0 + 510000);
    expect(s.plays.map((p) => p.track.id)).to.deep.equal(["a", "b", "c"]);
  });

  it("repairs a finalized live play when a poll returns before history", () => {
    const a = track("a", 240000);
    let s = MusicSession_observe(MusicSession_start(1, t0), playing(a, 30000), t0 + 30000);
    s = MusicSession_observe(s, playing(track("c"), 20000), t0 + 500000);
    expect(s.plays[0].isKept).to.equal(false);
    s = MusicSession_mergeHistory(s, [{ track: a, startedAt: t0, endedAt: t0 + 240000 }], t0 + 500000);
    expect(s.plays.map((p) => [p.heardMs, p.isKept, p.source])).to.deep.equal([[240000, true, "live"]]);
  });

  it("matches history to the nearest repeat and does not shorten a longer live observation", () => {
    const a = track("a", 240000);
    let s = MusicSession_observe(MusicSession_start(1, t0), playing(a, 300000), t0 + 300000);
    s = MusicSession_observe(s, playing(a, 1000), t0 + 301000);
    s = MusicSession_mergeHistory(s, [{ track: a, startedAt: t0, endedAt: t0 + 240000 }], t0 + 310000);
    expect(s.plays[0].heardMs).to.equal(300000);
    expect(s.current?.maxProgressMs).to.equal(1000);
  });

  it("keeps a song heard for half its length or to within 20 seconds of the end", () => {
    expect(MusicSession_isKept(100000, 200000)).to.equal(true);
    expect(MusicSession_isKept(99000, 200000)).to.equal(false);
    expect(MusicSession_isKept(45000, 60000)).to.equal(true);
  });

  it("marks a song skipped when the next one starts early, and kept when it played out", () => {
    let s = MusicSession_start(1, t0);
    s = MusicSession_observe(s, playing(track("a"), 10000), t0 + 10000);
    s = MusicSession_observe(s, playing(track("a"), 40000), t0 + 40000);
    s = MusicSession_observe(s, playing(track("b"), 5000), t0 + 45000);
    s = MusicSession_observe(s, playing(track("b"), 190000), t0 + 230000);
    s = MusicSession_observe(s, playing(track("c"), 3000), t0 + 240000);
    expect(s.plays.map((p) => [p.track.id, p.isKept])).to.deep.equal([
      ["a", false],
      ["b", true],
    ]);
    expect(s.current?.track.id).to.equal("c");
  });

  it("treats a pause or nothing playing as the same song, not a skip", () => {
    let s = MusicSession_start(1, t0);
    s = MusicSession_observe(s, playing(track("a"), 30000), t0);
    s = MusicSession_observe(s, undefined, t0 + 60000);
    s = MusicSession_observe(s, { track: track("a"), progressMs: 30000, isPlaying: false }, t0 + 120000);
    s = MusicSession_observe(s, playing(track("a"), 150000), t0 + 300000);
    expect(s.plays).to.have.length(0);
    expect(s.current?.maxProgressMs).to.equal(150000);
  });

  it("counts a restart of the same song as a new play", () => {
    let s = MusicSession_start(1, t0);
    s = MusicSession_observe(s, playing(track("a"), 150000), t0);
    s = MusicSession_observe(s, playing(track("a"), 2000), t0 + 60000);
    expect(s.plays).to.have.length(1);
    expect(s.plays[0].isKept).to.equal(true);
    expect(s.current?.maxProgressMs).to.equal(2000);
  });

  it("keeps one play when the user scrubs back to the middle of the song", () => {
    const kryptonite = track("k", 233933);
    let s = MusicSession_start(1, t0);
    for (let progress = 8000; progress <= 181555; progress += 8000) {
      s = MusicSession_observe(s, playing(kryptonite, progress), t0 + progress);
    }
    s = MusicSession_observe(s, playing(kryptonite, 181555), t0 + 181555);
    s = MusicSession_observe(s, playing(kryptonite, 106000), t0 + 189555);
    s = MusicSession_observe(s, playing(kryptonite, 227309), t0 + 310864);
    s = MusicSession_observe(s, playing(track("next"), 2000), t0 + 318864);
    expect(s.plays.map((p) => [p.track.id, p.startedAt, p.heardMs])).to.deep.equal([["k", t0, 227309]]);
  });

  it("keeps one play when the user scrubs back after a long pause", () => {
    let s = MusicSession_start(1, t0);
    s = MusicSession_observe(s, playing(track("a"), 150000), t0);
    s = MusicSession_observe(s, { track: track("a"), progressMs: 150000, isPlaying: false }, t0 + 300000);
    s = MusicSession_observe(s, playing(track("a"), 100000), t0 + 308000);
    expect(s.plays).to.have.length(0);
    expect(s.current?.firstSeenAt).to.equal(t0 - 150000);
  });

  it("counts a restart right after the song played out as a new play", () => {
    let s = MusicSession_start(1, t0);
    s = MusicSession_observe(s, playing(track("a"), 195000), t0);
    s = MusicSession_observe(s, playing(track("a"), 3000), t0 + 8000);
    expect(s.plays.map((p) => p.heardMs)).to.deep.equal([195000]);
    expect(s.current?.firstSeenAt).to.equal(t0 + 5000);
  });

  it("skips a history copy of a live play that Spotify lists under another track id", () => {
    const live = { ...track("live-faded", 206666), name: "Faded", artists: "Tyga, Lil Wayne" };
    const relinked = { ...live, id: "history-faded", uri: "spotify:track:history-faded", durationMs: 211413 };
    let s = MusicSession_start(1, t0);
    s = MusicSession_observe(s, playing(live, 206666), t0 + 206666);
    s = MusicSession_observe(s, playing(track("b"), 1000), t0 + 214000);
    s = MusicSession_mergeHistory(s, [{ track: relinked, startedAt: t0 + 162, endedAt: t0 + 211575 }], t0 + 300000);
    expect(s.plays.map((p) => [p.track.id, p.source])).to.deep.equal([["live-faded", "live"]]);
  });

  it("drops the copies older builds stored: a seek back as a second play, a relinked history copy", () => {
    const k = track("k", 233933);
    const faded = { ...track("live-faded", 206666), name: "Faded" };
    const fadedHistory = { ...faded, id: "history-faded", uri: "spotify:track:history-faded" };
    const plays: IMusicPlay[] = [
      { track: faded, startedAt: t0, heardMs: 206666, source: "live", isKept: true },
      { track: fadedHistory, startedAt: t0 + 162, heardMs: 211413, source: "history", isKept: true },
      { track: k, startedAt: t0 + 438126, heardMs: 181555, source: "live", isKept: true },
      { track: k, startedAt: t0 + 521508, heardMs: 227309, source: "live", isKept: true },
      { track: k, startedAt: t0 + 3000000, heardMs: 233933, source: "live", isKept: true },
    ];
    const s = MusicSession_dropCopies({ id: 1, startedAt: t0, plays });
    expect(s.plays.map((p) => [p.track.id, p.startedAt, p.heardMs, p.source])).to.deep.equal([
      ["live-faded", t0, 211413, "live"],
      ["k", t0 + 438126, 227309, "live"],
      ["k", t0 + 3000000, 233933, "live"],
    ]);
    expect(MusicLog_parse({ sessions: [{ id: 1, startedAt: t0, plays }] }).sessions[0].plays).to.have.length(3);
  });

  it("closes the last song when the workout ends, and ignores later snapshots", () => {
    let s = MusicSession_start(1, t0);
    s = MusicSession_observe(s, playing(track("a"), 20000), t0);
    s = MusicSession_finish(s, t0 + 30000);
    expect(s.plays.map((p) => p.isKept)).to.deep.equal([false]);
    expect(MusicSession_observe(s, playing(track("b"), 1000), t0 + 40000)).to.equal(s);
  });

  it("adds songs that played while the phone was locked, once, inside the workout only", () => {
    let s = MusicSession_start(1, t0);
    s = MusicSession_observe(s, playing(track("a"), 10000), t0 + 10000);
    const history = [
      { track: track("old"), startedAt: t0 - 260000, endedAt: t0 - 60000 },
      { track: track("a"), startedAt: t0, endedAt: t0 + 200000 },
      { track: track("x"), startedAt: t0 + 200000, endedAt: t0 + 400000 },
      { track: track("late"), startedAt: t0 + 600000, endedAt: t0 + 800000 },
    ];
    s = MusicSession_mergeHistory(s, history, t0 + 500000);
    s = MusicSession_mergeHistory(s, history, t0 + 500000);
    expect(s.plays.map((p) => [p.track.id, p.startedAt, p.source, p.isKept])).to.deep.equal([
      ["x", t0 + 200000, "history", true],
    ]);
  });

  it("adds a song that started before the workout and ended during it", () => {
    const s = MusicSession_mergeHistory(
      MusicSession_start(1, t0),
      [{ track: track("warmup"), startedAt: t0 - 170000, endedAt: t0 + 30000 }],
      t0 + 60000
    );
    expect(s.plays.map((p) => p.track.id)).to.deep.equal(["warmup"]);
  });

  it("lists kept songs once each, and lets the review untick one", () => {
    let s = MusicSession_start(1, t0);
    for (const [id, progress] of [
      ["a", 190000],
      ["b", 5000],
      ["a", 190000],
      ["c", 190000],
    ] as [string, number][]) {
      s = MusicSession_observe(s, playing(track(id), progress), t0);
    }
    s = MusicSession_finish(s, t0);
    expect(MusicSession_keptTracks(s).map((t) => t.id)).to.deep.equal(["a", "c"]);
    expect(MusicSession_counts(s)).to.deep.equal({ kept: 3, skipped: 1 });
    const cIndex = s.plays.findIndex((p) => p.track.id === "c");
    expect(MusicSession_keptTracks(MusicSession_setKept(s, cIndex, false)).map((t) => t.id)).to.deep.equal(["a"]);
  });
});

describe("Spotify parsing", () => {
  const raw = {
    id: "4uLU6hMCjMI75M1A2tKUQC",
    uri: "spotify:track:4uLU6hMCjMI75M1A2tKUQC",
    name: "Never Gonna Give You Up",
    duration_ms: 213573,
    artists: [{ name: "Rick Astley" }],
    album: { images: [{ url: "big.jpg" }, { url: "small.jpg" }] },
    type: "track",
  };

  it("reads the playing track and skips podcast episodes", () => {
    expect(SpotifyTracks_parseNowPlaying({ item: raw, progress_ms: 1200, is_playing: true })).to.deep.equal({
      track: {
        id: raw.id,
        uri: raw.uri,
        name: raw.name,
        artists: "Rick Astley",
        durationMs: 213573,
        imageUrl: "small.jpg",
      },
      progressMs: 1200,
      isPlaying: true,
    });
    expect(SpotifyTracks_parseNowPlaying({ item: { ...raw, type: "episode" }, progress_ms: 1 })).to.equal(undefined);
    expect(SpotifyTracks_parseNowPlaying(undefined)).to.equal(undefined);
  });

  it("reads recently played oldest first", () => {
    const history = SpotifyTracks_parseHistory({
      items: [
        { track: raw, played_at: "2026-10-20T10:05:00.000Z" },
        { track: { ...raw, id: "b" }, played_at: "2026-10-20T10:01:00.000Z" },
        { track: raw, played_at: "not a date" },
      ],
    });
    expect(history.map((h) => h.track.id)).to.deep.equal(["b", raw.id]);
    const endedAt = Date.parse("2026-10-20T10:01:00.000Z");
    expect(history[0].endedAt).to.equal(endedAt);
    expect(history[0].startedAt).to.equal(endedAt - history[0].track.durationMs);
  });
});

describe("Spotify login", () => {
  it("builds the authorize URL with PKCE and every scope", () => {
    const url = new URL(
      SpotifyAuth_authorizeUrl({ clientId: "abc", redirectUri: "https://x.com/app/", state: "s1", codeChallenge: "ch" })
    );
    expect(url.origin + url.pathname).to.equal("https://accounts.spotify.com/authorize");
    expect(url.searchParams.get("code_challenge_method")).to.equal("S256");
    expect(url.searchParams.get("scope")).to.include("user-read-recently-played");
    expect(url.searchParams.get("redirect_uri")).to.equal("https://x.com/app/");
  });

  it("accepts a code only with the state it sent", () => {
    expect(SpotifyAuth_readRedirect("https://x.com/app/?code=c1&state=s1", "s1")).to.deep.equal({
      kind: "code",
      code: "c1",
    });
    expect(SpotifyAuth_readRedirect("https://x.com/app/?code=c1&state=evil", "s1").kind).to.equal("error");
    expect(SpotifyAuth_readRedirect("https://x.com/app/?error=access_denied&state=s1", "s1")).to.deep.equal({
      kind: "error",
      message: "Spotify login was cancelled.",
    });
    expect(SpotifyAuth_readRedirect("https://x.com/app/", undefined)).to.deep.equal({ kind: "none" });
    expect(SpotifyAuth_cleanUrl("https://x.com/app/?code=c1&state=s1&tab=food")).to.equal(
      "https://x.com/app/?tab=food"
    );
  });

  it("keeps the old refresh token when a refresh does not send a new one", () => {
    const tokens = SpotifyAuth_parseTokens({ access_token: "a2", expires_in: 3600 }, 1000, "r1");
    expect(tokens).to.deep.equal({ accessToken: "a2", refreshToken: "r1", expiresAt: 3601000 });
    expect(SpotifyAuth_needsRefresh(tokens!, 3601000 - 61000)).to.equal(false);
    expect(SpotifyAuth_needsRefresh(tokens!, 3601000 - 59000)).to.equal(true);
    expect(SpotifyAuth_parseTokens({ access_token: "a2", expires_in: 3600 }, 1000)).to.equal(undefined);
  });
});

describe("MusicLog", () => {
  it("survives a round trip and drops broken sessions", () => {
    let s = MusicSession_start(7, t0);
    s = MusicSession_observe(s, playing(track("a"), 190000), t0);
    s = MusicSession_observe(s, playing(track("b"), 1000), t0 + 1000);
    const log = MusicLog_putSession(
      { ...MusicLog_empty(), tokens: { accessToken: "a", refreshToken: "r", expiresAt: 5 } },
      s
    );
    const stored = JSON.parse(JSON.stringify(log));
    stored.sessions.push({ id: "bad" });
    expect(MusicLog_parse(stored)).to.deep.equal(log);
  });

  it("exports the sessions without the Spotify tokens", () => {
    const s = MusicSession_observe(MusicSession_start(7, t0), playing(track("a"), 1000), t0);
    const log = MusicLog_putSession(
      { ...MusicLog_empty(), displayName: "Paul", tokens: { accessToken: "a", refreshToken: "r", expiresAt: 5 } },
      s
    );
    const json = MusicLog_exportJson(log);
    expect(json).to.not.include("refreshToken");
    expect(JSON.parse(json)).to.not.have.property("tokens");
    const parsed = MusicLog_parse(JSON.parse(json));
    expect(parsed.sessions).to.deep.equal(log.sessions);
    expect(parsed.displayName).to.equal("Paul");
  });
});

describe("Spotify tester login", () => {
  let log: ReturnType<typeof MusicLog_empty>;
  let fetchStub: sinon.SinonStub;
  let storage: Map<string, string>;
  let windowDescriptor: PropertyDescriptor | undefined;
  let storageDescriptor: PropertyDescriptor | undefined;

  beforeEach(() => {
    log = MusicLog_empty();
    storage = new Map([["bebear_spotify_pkce", JSON.stringify({ state: "s1", verifier: "v1" })]]);
    windowDescriptor = Object.getOwnPropertyDescriptor(globalThis, "window");
    storageDescriptor = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: {
        location: { href: "https://x.com/app/?code=c1&state=s1", origin: "https://x.com" },
        history: { replaceState: sinon.stub() },
      },
    });
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: {
        getItem: (key: string) => storage.get(key) ?? null,
        setItem: (key: string, value: string) => storage.set(key, value),
        removeItem: (key: string) => storage.delete(key),
      },
    });
    sinon.stub(musicStore, "MusicStore_load").callsFake(async () => log);
    sinon.stub(musicStore, "MusicStore_update").callsFake(async (update) => {
      log = update(log);
    });
    fetchStub = sinon.stub(globalThis, "fetch");
    fetchStub
      .onFirstCall()
      .resolves(new Response(JSON.stringify({ access_token: "a", refresh_token: "r", expires_in: 3600 })));
  });

  afterEach(() => {
    sinon.restore();
    SpotifyClient_takeCameBackFromLogin();
    if (windowDescriptor != null) {
      Object.defineProperty(globalThis, "window", windowDescriptor);
    } else {
      Reflect.deleteProperty(globalThis, "window");
    }
    if (storageDescriptor != null) {
      Object.defineProperty(globalThis, "localStorage", storageDescriptor);
    } else {
      Reflect.deleteProperty(globalThis, "localStorage");
    }
  });

  it("stores the tester limit message and disconnects when the profile returns 403", async () => {
    fetchStub.onSecondCall().resolves(new Response("User not registered in the Developer Dashboard", { status: 403 }));
    expect(await SpotifyClient_handleRedirect()).to.equal(true);
    expect(fetchStub.secondCall.args[0]).to.equal("https://api.spotify.com/v1/me");
    expect(log.tokens).to.equal(undefined);
    expect(SpotifyClient_takeError()).to.equal(SpotifyClient_testerLimitMessage);
    expect(SpotifyClient_takeError()).to.equal(undefined);
  });

  it("keeps an approved tester connected and reads their display name", async () => {
    fetchStub.onSecondCall().resolves(new Response(JSON.stringify({ id: "tester", display_name: "Tester" })));
    expect(await SpotifyClient_handleRedirect()).to.equal(true);
    expect(log.tokens?.accessToken).to.equal("a");
    expect(log.displayName).to.equal("Tester");
    expect(SpotifyClient_takeError()).to.equal(undefined);
  });

  it("reports a network failure without calling it a tester limit", async () => {
    fetchStub.onSecondCall().rejects(new TypeError("Failed to fetch"));
    await SpotifyClient_handleRedirect();
    expect(SpotifyClient_takeError()).to.equal("Could not reach Spotify. Check the connection and try again.");
  });
});

describe("Spotify listen links", () => {
  it("stores HTTPS links and derives app links for Spotify content", () => {
    for (const kind of ["playlist", "album", "show", "episode", "track", "artist"]) {
      const uri = `spotify:${kind}:abc123`;
      const url = `https://open.spotify.com/${kind}/abc123`;
      expect(ListenLinks_normalize(uri)).to.equal(url);
      expect(ListenLinks_spotifyUri(`${url}?si=share`)).to.equal(uri);
      expect(ListenLinks_spotifyUri(uri)).to.equal(uri);
    }
    expect(ListenLinks_spotifyUri("https://open.spotify.com/intl-es/track/abc123")).to.equal("spotify:track:abc123");
  });

  it("leaves other HTTPS links as web links and rejects unsupported Spotify paths", () => {
    expect(ListenLinks_normalize("https://example.com/listen")).to.equal("https://example.com/listen");
    for (const url of [
      "https://example.com/playlist/abc123",
      "https://open.spotify.com.evil.com/track/abc123",
      "https://open.spotify.com/user/abc123",
      "http://open.spotify.com/track/abc123",
      "not a URL",
    ]) {
      expect(ListenLinks_spotifyUri(url)).to.equal(undefined);
    }
  });
});
