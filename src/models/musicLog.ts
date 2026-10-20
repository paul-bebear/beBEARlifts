import { ISpotifyTokens, SpotifyAuth_parseTokensRecord } from "./spotifyAuth";
import { IMusicPlay, IMusicSession } from "./musicSession";
import { SpotifyTracks_parseTrack, ISpotifyTrack } from "./spotifyTracks";

export interface IMusicLog {
  version: 1;
  tokens?: ISpotifyTokens;
  displayName?: string;
  sessions: IMusicSession[];
}

const maxSessions = 60;

export function MusicLog_empty(): IMusicLog {
  return { version: 1, sessions: [] };
}

function num(value: unknown): number | undefined {
  return typeof value === "number" && isFinite(value) ? value : undefined;
}

// Stored tracks use the app's own field names, so they go through the same checks under Spotify's.
function parseStoredTrack(raw: unknown): ISpotifyTrack | undefined {
  const r = (raw ?? {}) as Record<string, unknown>;
  return SpotifyTracks_parseTrack({
    id: r.id,
    uri: r.uri,
    name: r.name,
    artists: typeof r.artists === "string" ? [{ name: r.artists }] : [],
    duration_ms: r.durationMs,
    album: typeof r.imageUrl === "string" ? { images: [{ url: r.imageUrl }] } : undefined,
  });
}

function parsePlay(raw: unknown): IMusicPlay | undefined {
  const r = (raw ?? {}) as Record<string, unknown>;
  const track = parseStoredTrack(r.track);
  const startedAt = num(r.startedAt);
  const heardMs = num(r.heardMs);
  if (track == null || startedAt == null || heardMs == null) {
    return undefined;
  }
  return { track, startedAt, heardMs, source: r.source === "history" ? "history" : "live", isKept: r.isKept === true };
}

function parseSession(raw: unknown): IMusicSession | undefined {
  const r = (raw ?? {}) as Record<string, unknown>;
  const id = num(r.id);
  const startedAt = num(r.startedAt);
  if (id == null || startedAt == null) {
    return undefined;
  }
  const plays = Array.isArray(r.plays) ? r.plays.map(parsePlay).filter((p): p is IMusicPlay => p != null) : [];
  const session: IMusicSession = { id, startedAt, plays };
  const endedAt = num(r.endedAt);
  if (endedAt != null) {
    session.endedAt = endedAt;
  }
  const current = (r.current ?? undefined) as Record<string, unknown> | undefined;
  const currentTrack = current != null ? parseStoredTrack(current.track) : undefined;
  const firstSeenAt = num(current?.firstSeenAt);
  const maxProgressMs = num(current?.maxProgressMs);
  if (currentTrack != null && firstSeenAt != null && maxProgressMs != null) {
    session.current = { track: currentTrack, firstSeenAt, maxProgressMs };
  }
  return session;
}

export function MusicLog_parse(raw: unknown): IMusicLog {
  if (raw == null || typeof raw !== "object") {
    return MusicLog_empty();
  }
  const r = raw as Record<string, unknown>;
  const log: IMusicLog = {
    version: 1,
    sessions: Array.isArray(r.sessions)
      ? r.sessions.map(parseSession).filter((s): s is IMusicSession => s != null)
      : [],
  };
  const tokens = SpotifyAuth_parseTokensRecord(r.tokens);
  if (tokens != null) {
    log.tokens = tokens;
  }
  if (typeof r.displayName === "string") {
    log.displayName = r.displayName;
  }
  return log;
}

export function MusicLog_session(log: IMusicLog, id: number): IMusicSession | undefined {
  return log.sessions.find((s) => s.id === id);
}

export function MusicLog_putSession(log: IMusicLog, session: IMusicSession): IMusicLog {
  const others = log.sessions.filter((s) => s.id !== session.id);
  return { ...log, sessions: [session, ...others].sort((a, b) => b.startedAt - a.startedAt).slice(0, maxSessions) };
}

export function MusicLog_reviewable(log: IMusicLog): IMusicSession[] {
  return log.sessions.filter((s) => s.plays.length > 0 || s.current != null);
}

export function MusicLog_formatDuration(ms: number): string {
  const totalSeconds = Math.round(ms / 1000);
  return `${Math.floor(totalSeconds / 60)}:${String(totalSeconds % 60).padStart(2, "0")}`;
}

export function MusicLog_disconnect(log: IMusicLog): IMusicLog {
  return { ...log, tokens: undefined, displayName: undefined };
}

// The export goes to a file the user may share, so the Spotify refresh token stays on the phone.
export function MusicLog_exportJson(log: IMusicLog): string {
  return JSON.stringify({ ...log, tokens: undefined });
}
