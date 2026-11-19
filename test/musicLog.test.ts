import "mocha";
import { expect } from "chai";
import {
  MusicLog_disconnect,
  MusicLog_empty,
  MusicLog_exportJson,
  MusicLog_parse,
  MusicLog_keepNote,
  MusicLog_maxSessions,
  MusicLog_playStatus,
  MusicLog_putSession,
  MusicLog_saveStatus,
  MusicLog_session,
  MusicLog_sessionTitle,
  MusicLog_setKept,
  MusicLog_workoutLookup,
} from "../src/models/musicLog";
import { IMusicPlay, IMusicSession } from "../src/models/musicSession";

const t0 = 1_700_000_000_000;

function play(id: string, startedAt: number, isKept: boolean): IMusicPlay {
  return {
    track: { id, uri: `spotify:track:${id}`, name: id, artists: "A", durationMs: 200000 },
    startedAt,
    heardMs: 200000,
    source: "live",
    isKept,
  };
}

describe("MusicLog_setKept", () => {
  it("changes only the tapped play and keeps plays added since the screen drew", () => {
    const drawn: IMusicSession = { id: 1, startedAt: t0, plays: [play("a", t0, true)] };
    const fresh: IMusicSession = {
      ...drawn,
      plays: [play("early", t0 - 1000, true), play("a", t0, true), play("b", t0 + 5000, true)],
    };
    const log = MusicLog_putSession(MusicLog_empty(), fresh);
    const next = MusicLog_setKept(log, 1, { trackId: "a", startedAt: t0 }, false);
    const plays = MusicLog_session(next, 1)?.plays ?? [];
    expect(plays.map((p) => [p.track.id, p.isKept])).to.deep.equal([
      ["early", true],
      ["a", false],
      ["b", true],
    ]);
  });

  it("returns the same log when the session or play is gone", () => {
    const log = MusicLog_putSession(MusicLog_empty(), { id: 1, startedAt: t0, plays: [play("a", t0, true)] });
    expect(MusicLog_setKept(log, 2, { trackId: "a", startedAt: t0 }, false)).to.equal(log);
    expect(MusicLog_setKept(log, 1, { trackId: "x", startedAt: t0 }, false)).to.equal(log);
  });
});

describe("MusicLog_workoutLookup", () => {
  const history = [
    { id: 5, startTime: t0, endTime: t0 + 1000 },
    { id: 6, startTime: t0 + 10000, endTime: t0 + 20000 },
  ];
  it("finds by id first, then by start time", () => {
    const find = MusicLog_workoutLookup(history);
    expect(find({ id: 6, startedAt: 0, plays: [] })?.id).to.equal(6);
    expect(find({ id: 0, startedAt: t0 + 15000, plays: [] })?.id).to.equal(6);
    expect(find({ id: 0, startedAt: t0 + 5000, plays: [] })).to.equal(undefined);
  });
});

describe("MusicLog texts", () => {
  it("builds the session title with and without a day name", () => {
    const session: IMusicSession = { id: 1, startedAt: t0, plays: [] };
    const plain = MusicLog_sessionTitle(session, undefined);
    expect(MusicLog_sessionTitle(session, "Push")).to.equal(`${plain} · Push`);
  });

  it("pluralises the save status", () => {
    expect(MusicLog_saveStatus(1)).to.equal("Saved 1 song to Spotify.");
    expect(MusicLog_saveStatus(3)).to.equal("Saved 3 songs to Spotify.");
  });

  it("builds the play status", () => {
    expect(MusicLog_playStatus({ ok: true })).to.equal("Playing on Spotify.");
    expect(MusicLog_playStatus({ ok: false, message: "No device" })).to.equal("No device");
  });

  it("names the cap from the constant", () => {
    expect(MusicLog_keepNote).to.contain(`newest ${MusicLog_maxSessions} workouts`);
    expect(MusicLog_keepNote).to.contain("newest 210 workouts");
  });
});

describe("MusicLog tokens in the plain store", () => {
  const tokens = { accessToken: "test-access", refreshToken: "test-refresh", expiresAt: t0 };
  const saved = { version: 1, tokens, displayName: "Bear", sessions: [{ id: 1, startedAt: t0, plays: [] }] };

  it("still reads a token that an older build or an old backup saved", () => {
    expect(MusicLog_parse(saved).tokens).to.deep.equal(tokens);
  });

  it("keeps the token out of the export and drops it and the name on sign-out", () => {
    const log = MusicLog_parse(saved);
    expect(JSON.parse(MusicLog_exportJson(log))).to.not.have.property("tokens");
    const out = MusicLog_disconnect(log);
    expect(out.tokens).to.equal(undefined);
    expect(out.displayName).to.equal(undefined);
    expect(out.sessions).to.deep.equal(log.sessions);
  });
});
