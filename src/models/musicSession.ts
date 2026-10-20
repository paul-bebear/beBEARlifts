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
  playlistUrl?: string;
}

const keptShare = 0.5;
const nearEndMs = 20 * 1000;
// A jump back by more than this on the same track is a restart, and counts as a new play.
const restartMs = 15 * 1000;
const historySlackMs = 5 * 60 * 1000;

export function MusicSession_isKept(heardMs: number, durationMs: number): boolean {
  return heardMs >= keptShare * durationMs || heardMs >= durationMs - nearEndMs;
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
  return { ...session, plays: [...session.plays, play], current: undefined };
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
  const isSameTrack = current != null && current.track.id === snapshot.track.id;
  const isRestart = isSameTrack && snapshot.progressMs + restartMs < current.maxProgressMs;
  if (isSameTrack && !isRestart) {
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
  const known = [
    ...session.plays,
    ...(session.current != null ? [{ track: session.current.track, startedAt: session.current.firstSeenAt }] : []),
  ];
  const added: IMusicPlay[] = [];
  for (const item of history) {
    if (item.endedAt <= session.startedAt || item.startedAt > end) {
      continue;
    }
    const isKnown = known.some(
      (p) =>
        p.track.id === item.track.id && Math.abs(p.startedAt - item.startedAt) <= item.track.durationMs + historySlackMs
    );
    if (!isKnown) {
      added.push({
        track: item.track,
        startedAt: item.startedAt,
        heardMs: item.track.durationMs,
        source: "history",
        isKept: true,
      });
    }
  }
  if (added.length === 0) {
    return session;
  }
  return { ...session, plays: [...session.plays, ...added].sort((a, b) => a.startedAt - b.startedAt) };
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
