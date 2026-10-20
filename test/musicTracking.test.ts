import "mocha";
import { expect } from "chai";
import { createHash } from "crypto";
import { MusicLog_empty, MusicLog_formatDuration, MusicLog_reviewable, MusicLog_session } from "../src/models/musicLog";
import {
  MusicTracking_finishOthers,
  MusicTracking_mergeHistory,
  MusicTracking_observe,
} from "../src/models/musicTracking";
import { ISpotifyTrack } from "../src/models/spotifyTracks";
import { SpotifyAuth_base64Url, SpotifyAuth_randomString } from "../src/models/spotifyAuth";
import {
  SpotifyPlaylist_chunks,
  SpotifyPlaylist_parseCreated,
  SpotifyPlaylist_parseProfile,
  SpotifyPlaylist_playError,
  SpotifyPlaylist_shouldFallBack,
} from "../src/models/spotifyPlaylist";

function track(id: string, durationMs: number = 200000): ISpotifyTrack {
  return { id, uri: `spotify:track:${id}`, name: `Song ${id}`, artists: "Artist", durationMs };
}

const workout = { id: 42, startTime: 1_000_000 };

describe("MusicTracking", () => {
  it("does not store a session while nothing has played", () => {
    const log = MusicLog_empty();
    expect(MusicTracking_observe(log, workout, undefined, 1_010_000)).to.equal(log);
    expect(MusicTracking_mergeHistory(log, workout, [], 1_010_000)).to.equal(log);
  });

  it("starts the session at the workout start and keys it by the workout id", () => {
    const now = 1_100_000;
    const log = MusicTracking_observe(
      MusicLog_empty(),
      workout,
      { track: track("a"), progressMs: 5000, isPlaying: true },
      now
    );
    const session = MusicLog_session(log, 42)!;
    expect(session.startedAt).to.equal(workout.startTime);
    expect(session.current?.track.id).to.equal("a");
    expect(session.current?.firstSeenAt).to.equal(now - 5000);
  });

  it("returns the same log when a poll changes nothing", () => {
    const log = MusicTracking_observe(
      MusicLog_empty(),
      workout,
      { track: track("a"), progressMs: 5000, isPlaying: true },
      1_100_000
    );
    expect(MusicTracking_observe(log, workout, undefined, 1_108_000)).to.equal(log);
  });

  it("adds songs from history that played during the workout", () => {
    const log = MusicTracking_mergeHistory(
      MusicLog_empty(),
      workout,
      [
        { track: track("early"), playedAt: workout.startTime - 60_000 },
        { track: track("b"), playedAt: workout.startTime + 60_000 },
      ],
      workout.startTime + 600_000
    );
    expect(MusicLog_session(log, 42)!.plays.map((p) => p.track.id)).to.deep.equal(["b"]);
  });

  it("closes every open session except the active workout", () => {
    let log = MusicTracking_observe(
      MusicLog_empty(),
      { id: 1, startTime: 0 },
      { track: track("a"), progressMs: 150_000, isPlaying: true },
      200_000
    );
    log = MusicTracking_observe(log, workout, { track: track("b"), progressMs: 1000, isPlaying: true }, 1_100_000);
    const closed = MusicTracking_finishOthers(log, 42, 1_200_000);
    expect(MusicLog_session(closed, 1)!.endedAt).to.equal(1_200_000);
    expect(MusicLog_session(closed, 1)!.plays.map((p) => p.track.id)).to.deep.equal(["a"]);
    expect(MusicLog_session(closed, 42)!.endedAt).to.equal(undefined);
    const allClosed = MusicTracking_finishOthers(closed, undefined, 1_300_000);
    expect(MusicLog_session(allClosed, 42)!.endedAt).to.equal(1_300_000);
  });
});

describe("MusicLog review helpers", () => {
  it("lists only sessions that heard a song", () => {
    let log = MusicTracking_observe(
      MusicLog_empty(),
      workout,
      { track: track("a"), progressMs: 1000, isPlaying: true },
      1_100_000
    );
    log = { ...log, sessions: [...log.sessions, { id: 7, startedAt: 0, plays: [], endedAt: 10 }] };
    expect(MusicLog_reviewable(log).map((s) => s.id)).to.deep.equal([42]);
  });

  it("formats a song length as minutes and seconds", () => {
    expect(MusicLog_formatDuration(215_400)).to.equal("3:35");
    expect(MusicLog_formatDuration(59_600)).to.equal("1:00");
  });
});

describe("SpotifyAuth PKCE encoding", () => {
  it("makes a verifier from the allowed characters only", () => {
    const verifier = SpotifyAuth_randomString(new Uint8Array(Array.from({ length: 64 }, (_, i) => i * 4)));
    expect(verifier).to.have.length(64);
    expect(verifier).to.match(/^[A-Za-z0-9\-._~]+$/);
  });

  it("encodes the S256 challenge as unpadded base64url", () => {
    const verifier = "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk";
    const digest = new Uint8Array(createHash("sha256").update(verifier).digest());
    expect(SpotifyAuth_base64Url(digest)).to.equal("E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM");
  });
});

describe("SpotifyPlaylist", () => {
  it("splits URIs into calls of at most 100", () => {
    const uris = Array.from({ length: 205 }, (_, i) => `spotify:track:${i}`);
    expect(SpotifyPlaylist_chunks(uris).map((c) => c.length)).to.deep.equal([100, 100, 5]);
    expect(SpotifyPlaylist_chunks([])).to.deep.equal([]);
  });

  it("reads the profile and the created playlist", () => {
    expect(SpotifyPlaylist_parseProfile({ id: "u1", display_name: "Paul" })).to.deep.equal({
      id: "u1",
      displayName: "Paul",
    });
    expect(SpotifyPlaylist_parseProfile({ id: "u1", display_name: null })).to.deep.equal({
      id: "u1",
      displayName: "u1",
    });
    expect(SpotifyPlaylist_parseProfile({})).to.equal(undefined);
    expect(
      SpotifyPlaylist_parseCreated({ id: "p1", external_urls: { spotify: "https://open.spotify.com/playlist/p1" } })
    ).to.deep.equal({ id: "p1", url: "https://open.spotify.com/playlist/p1" });
    expect(SpotifyPlaylist_parseCreated({ error: { status: 404 } })).to.equal(undefined);
  });

  it("explains the playback errors the user can fix", () => {
    expect(SpotifyPlaylist_playError(204)).to.equal(undefined);
    expect(SpotifyPlaylist_playError(404)).to.contain("Open Spotify");
    expect(SpotifyPlaylist_playError(403)).to.contain("Premium");
    expect(SpotifyPlaylist_shouldFallBack(404)).to.equal(true);
    expect(SpotifyPlaylist_shouldFallBack(403)).to.equal(false);
  });
});
