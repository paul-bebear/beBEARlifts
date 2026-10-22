import "mocha";
import { expect } from "chai";
import { IHistoryRecord, ISet } from "../src/types";
import { IMusicPlay, IMusicSession } from "../src/models/musicSession";
import { ISpotifyTrack } from "../src/models/spotifyTracks";
import {
  SongPerSet_forEntry,
  SongPerSet_hasAny,
  SongPerSet_label,
  SongPerSet_match,
  SongPerSet_rowLabel,
  SongPerSet_trackAt,
} from "../src/models/songPerSet";

const t0 = 1_000_000;

function track(id: string, durationMs: number = 200000): ISpotifyTrack {
  return { id, uri: `spotify:track:${id}`, name: `Song ${id}`, artists: "Artist", durationMs };
}

function play(t: ISpotifyTrack, startedAt: number, heardMs: number, source: "live" | "history" = "live"): IMusicPlay {
  return { track: t, startedAt, heardMs, source, isKept: true };
}

function session(plays: IMusicPlay[], extra: Partial<IMusicSession> = {}): IMusicSession {
  return { id: 1, startedAt: t0, plays, ...extra };
}

function set(timestamp: number | undefined, isCompleted: boolean = true): ISet {
  return { vtype: "set", index: 0, id: "s", reps: 5, timestamp, isCompleted } as ISet;
}

function record(setsPerEntry: ISet[][]): IHistoryRecord {
  return { id: 1, entries: setsPerEntry.map((sets) => ({ sets })) } as unknown as IHistoryRecord;
}

describe("SongPerSet", () => {
  it("gives each completed set the song playing at its timestamp", () => {
    const s = session([play(track("a"), t0, 200000), play(track("b"), t0 + 200000, 200000)]);
    const r = record([[set(t0 + 10000), set(t0 + 250000)], [set(t0 + 399000)]]);
    expect(SongPerSet_match(r, s).map((m) => [m.entryIndex, m.setIndex, m.track?.id])).to.deep.equal([
      [0, 0, "a"],
      [0, 1, "b"],
      [1, 0, "b"],
    ]);
  });

  it("skips sets that are not completed and gives none to a completed set without a timestamp", () => {
    const s = session([play(track("a"), t0, 200000)]);
    const r = record([[set(t0 + 1000), set(t0 + 2000, false), set(undefined)]]);
    expect(SongPerSet_match(r, s).map((m) => [m.setIndex, m.track?.id])).to.deep.equal([
      [0, "a"],
      [2, undefined],
    ]);
  });

  it("matches a set ticked before the session started by the plays alone", () => {
    const early = session([play(track("a"), t0 - 60000, 200000), play(track("b"), t0 + 140000, 200000)]);
    const r = record([[set(t0 - 1000), set(t0 - 90000)]]);
    expect(SongPerSet_match(r, early).map((m) => m.track?.id)).to.deep.equal(["a", undefined]);
    expect(SongPerSet_match(r, session([play(track("b"), t0, 200000)])).map((m) => m.track)).to.deep.equal([
      undefined,
      undefined,
    ]);
  });

  it("gives none to a set in a gap where nothing played", () => {
    const s = session([play(track("a", 60000), t0, 60000), play(track("b"), t0 + 300000, 200000)]);
    expect(SongPerSet_trackAt(s, t0 + 59000)?.id).to.equal("a");
    expect(SongPerSet_trackAt(s, t0 + 100000)).to.equal(undefined);
    expect(SongPerSet_trackAt(s, t0 - 1000)).to.equal(undefined);
    expect(SongPerSet_trackAt(s, t0 + 500000)).to.equal(undefined);
  });

  it("ends a skipped song where the next one starts", () => {
    const s = session([play(track("a"), t0, 30000), play(track("b"), t0 + 30000, 200000)]);
    expect(SongPerSet_trackAt(s, t0 + 29000)?.id).to.equal("a");
    expect(SongPerSet_trackAt(s, t0 + 31000)?.id).to.equal("b");
  });

  it("stretches a live play cut short by a locked phone up to the next song from Spotify's history", () => {
    const s = session([play(track("a"), t0, 60000), play(track("b"), t0 + 200000, 200000, "history")]);
    expect(SongPerSet_trackAt(s, t0 + 150000)?.id).to.equal("a");
    expect(SongPerSet_trackAt(s, t0 + 210000)?.id).to.equal("b");
  });

  it("never stretches a live play past the song's length", () => {
    const s = session([play(track("a", 100000), t0, 60000)]);
    expect(SongPerSet_trackAt(s, t0 + 99000)?.id).to.equal("a");
    expect(SongPerSet_trackAt(s, t0 + 101000)).to.equal(undefined);
  });

  it("uses the session's current track for sets after the last closed play", () => {
    const s = session([play(track("a"), t0, 200000)], {
      current: { track: track("c"), firstSeenAt: t0 + 200000, maxProgressMs: 40000 },
    });
    expect(SongPerSet_trackAt(s, t0 + 250000)?.id).to.equal("c");
    expect(SongPerSet_trackAt(s, t0 + 100000)?.id).to.equal("a");
  });

  it("sorts plays by start, so history plays merged out of order still match", () => {
    const s = session([play(track("b"), t0 + 200000, 200000), play(track("a"), t0, 200000, "history")]);
    expect(SongPerSet_trackAt(s, t0 + 100000)?.id).to.equal("a");
  });

  it("gives none to every set when there is no music session", () => {
    const songs = SongPerSet_match(record([[set(t0)]]), undefined);
    expect(songs.map((m) => m.track)).to.deep.equal([undefined]);
    expect(SongPerSet_hasAny(songs)).to.equal(false);
  });

  it("lists one exercise's sets that have a song, with a 1-based set number", () => {
    const s = session([play(track("a"), t0, 200000)]);
    const songs = SongPerSet_match(record([[set(t0 - 5000), set(t0 + 1000)], [set(t0 + 2000)]]), s);
    expect(SongPerSet_hasAny(songs)).to.equal(true);
    expect(SongPerSet_forEntry(songs, 0).map(SongPerSet_label)).to.deep.equal(["Set 2 · Song a · Artist"]);
  });

  it("names the exercise and says no song on the Music screen rows", () => {
    const s = session([play(track("a"), t0, 200000)]);
    const songs = SongPerSet_match(record([[set(t0 - 5000), set(t0 + 1000)]]), s);
    expect(songs.map((song) => SongPerSet_rowLabel(song, "Squat"))).to.deep.equal([
      "Squat set 1 · no song",
      "Squat set 2 · Song a · Artist",
    ]);
  });
});
