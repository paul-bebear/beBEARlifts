import { ISpotifyHistoryItem, ISpotifyNowPlaying, ISpotifyTrack } from "./spotifyTracks";

export interface IMusicPlay {
  track: ISpotifyTrack;
  startedAt: number;
  heardMs: number;
  source: "live" | "history";
  isKept: boolean;
}

export interface IMusicCurrent {
  track: ISpotifyTrack;
  firstSeenAt: number;
  maxProgressMs: number;
}

export interface IMusicSession {
  id: number;
  startedAt: number;
  endedAt?: number;
  plays: IMusicPlay[];
  current?: IMusicCurrent;
}

const keptShare = 0.5;
const nearEndMs = 20 * 1000;
const restartMs = 15 * 1000;
const historySlackMs = 5 * 60 * 1000;

export function MusicSession_isKept(heardMs: number, durationMs: number): boolean {
  return heardMs >= keptShare * durationMs || heardMs >= durationMs - nearEndMs;
}

// Spotify relinks a song to another track id between Now Playing and Recently Played, so the id alone misses copies.
function isSameSong(a: ISpotifyTrack, b: ISpotifyTrack): boolean {
  return a.id === b.id || (a.name === b.name && a.artists === b.artists);
}

function startsInside(play: { startedAt: number; heardMs: number }, startedAt: number): boolean {
  return startedAt < play.startedAt + play.heardMs - restartMs;
}

// The user scrubs back mid-song to line up the next song with a set. Only a jump back to the start is a new play.
function isRestart(current: IMusicCurrent, snapshot: ISpotifyNowPlaying): boolean {
  return snapshot.progressMs < restartMs && snapshot.progressMs + restartMs < current.maxProgressMs;
}

export function MusicSession_start(id: number, now: number): IMusicSession {
  return { id, startedAt: now, plays: [] };
}

function finalize(session: IMusicSession): IMusicSession {
  const current = session.current;
  if (current == null) {
    return session;
  }
  const play: IMusicPlay = {
    track: current.track,
    startedAt: current.firstSeenAt,
    heardMs: current.maxProgressMs,
    source: "live",
    isKept: MusicSession_isKept(current.maxProgressMs, current.track.durationMs),
  };
  return { ...session, plays: [...session.plays, play].sort((a, b) => a.startedAt - b.startedAt), current: undefined };
}

// Nothing playing leaves the current track open, so a pause between sets is not a skip.
export function MusicSession_observe(
  session: IMusicSession,
  snapshot: ISpotifyNowPlaying | undefined,
  now: number
): IMusicSession {
  if (snapshot == null || session.endedAt != null) {
    return session;
  }
  const current = session.current;
  if (current != null && isSameSong(current.track, snapshot.track) && !isRestart(current, snapshot)) {
    return { ...session, current: { ...current, maxProgressMs: Math.max(current.maxProgressMs, snapshot.progressMs) } };
  }
  const closed = finalize(session);
  return {
    ...closed,
    current: { track: snapshot.track, firstSeenAt: now - snapshot.progressMs, maxProgressMs: snapshot.progressMs },
  };
}

export function MusicSession_finish(session: IMusicSession, now: number): IMusicSession {
  return session.endedAt != null ? session : { ...finalize(session), endedAt: now };
}

// Songs that played while the phone was locked come only from Spotify's history. It lists only songs played to the end, so they are kept.
export function MusicSession_mergeHistory(
  session: IMusicSession,
  history: ISpotifyHistoryItem[],
  now: number
): IMusicSession {
  const end = session.endedAt ?? now;
  let current = session.current;
  const plays = [...session.plays];
  for (const item of history) {
    if (item.endedAt <= session.startedAt || item.startedAt > end) {
      continue;
    }
    const matches = plays.map((p, index) => ({ track: p.track, startedAt: p.startedAt, index }));
    if (current != null) {
      matches.push({ track: current.track, startedAt: current.firstSeenAt, index: -1 });
    }
    const match = matches
      .filter(
        (p) =>
          isSameSong(p.track, item.track) &&
          Math.abs(p.startedAt - item.startedAt) <= item.track.durationMs + historySlackMs
      )
      .sort((a, b) => Math.abs(a.startedAt - item.startedAt) - Math.abs(b.startedAt - item.startedAt))[0];
    if (match?.index === -1 && current != null) {
      current = { ...current, maxProgressMs: Math.max(current.maxProgressMs, item.track.durationMs) };
    } else if (match != null) {
      const play = plays[match.index];
      if (play.source === "live") {
        plays[match.index] = { ...play, heardMs: Math.max(play.heardMs, item.track.durationMs), isKept: true };
      }
    } else {
      plays.push({
        track: item.track,
        startedAt: item.startedAt,
        heardMs: item.track.durationMs,
        source: "history",
        isKept: true,
      });
    }
  }
  return { ...session, current, plays: plays.sort((a, b) => a.startedAt - b.startedAt) };
}

function mergeCopies(a: IMusicPlay, b: IMusicPlay): IMusicPlay {
  const kept = a.source === "live" || b.source === "history" ? a : b;
  return { ...kept, heardMs: Math.max(a.heardMs, b.heardMs), isKept: a.isKept || b.isKept };
}

// Builds before 2026-10-21 stored a seek back as a second play and a relinked history copy next to the live play.
export function MusicSession_dropCopies(session: IMusicSession): IMusicSession {
  const plays: IMusicPlay[] = [];
  for (const play of [...session.plays].sort((a, b) => a.startedAt - b.startedAt)) {
    const index = plays.findIndex((p) => isSameSong(p.track, play.track) && startsInside(p, play.startedAt));
    if (index === -1) {
      plays.push(play);
    } else {
      plays[index] = mergeCopies(plays[index], play);
    }
  }
  return plays.length === session.plays.length ? session : { ...session, plays };
}

export function MusicSession_setKept(session: IMusicSession, index: number, isKept: boolean): IMusicSession {
  return { ...session, plays: session.plays.map((p, i) => (i === index ? { ...p, isKept } : p)) };
}

export function MusicSession_keptTracks(session: IMusicSession): ISpotifyTrack[] {
  const seen = new Set<string>();
  const result: ISpotifyTrack[] = [];
  for (const play of session.plays) {
    if (play.isKept && !seen.has(play.track.id)) {
      seen.add(play.track.id);
      result.push(play.track);
    }
  }
  return result;
}

export function MusicSession_counts(session: IMusicSession): { kept: number; skipped: number } {
  const kept = session.plays.filter((p) => p.isKept).length;
  return { kept, skipped: session.plays.length - kept };
}
