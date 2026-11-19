import { ISpotifyTokens, SpotifyAuth_parseTokensRecord } from "./spotifyAuth";
import { IMusicPlay, IMusicSession, MusicSession_dropCopies, MusicSession_setKept } from "./musicSession";
import { SpotifyTracks_parseTrack, ISpotifyTrack } from "./spotifyTracks";
import { IHistoryRecord } from "../types";
import { UnknownValue_finite, UnknownValue_isRecord } from "./unknownValue";

type IWorkoutTimes = Pick<IHistoryRecord, "id" | "startTime" | "endTime">;

export interface IMusicLog {
  version: 1;
  tokens?: ISpotifyTokens;
  // The Keychain survives an app delete, so its token counts only while the plain store says Spotify is linked.
  spotifyLinked?: true;
  displayName?: string;
  sessions: IMusicSession[];
}

// One year at 4 workouts a week.
export const MusicLog_maxSessions = 210;

export const MusicLog_keepNote = `beBEAR keeps the newest ${MusicLog_maxSessions} workouts of music. Older ones are removed.`;

export function MusicLog_empty(): IMusicLog {
  return { version: 1, sessions: [] };
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
  const startedAt = UnknownValue_finite(r.startedAt);
  const heardMs = UnknownValue_finite(r.heardMs);
  if (track == null || startedAt == null || heardMs == null) {
    return undefined;
  }
  return { track, startedAt, heardMs, source: r.source === "history" ? "history" : "live", isKept: r.isKept === true };
}

function parseSession(raw: unknown): IMusicSession | undefined {
  const r = (raw ?? {}) as Record<string, unknown>;
  const id = UnknownValue_finite(r.id);
  const startedAt = UnknownValue_finite(r.startedAt);
  if (id == null || startedAt == null) {
    return undefined;
  }
  const plays = Array.isArray(r.plays) ? r.plays.map(parsePlay).filter((p): p is IMusicPlay => p != null) : [];
  const session: IMusicSession = { id, startedAt, plays };
  const endedAt = UnknownValue_finite(r.endedAt);
  if (endedAt != null) {
    session.endedAt = endedAt;
  }
  const current = (r.current ?? undefined) as Record<string, unknown> | undefined;
  const currentTrack = current != null ? parseStoredTrack(current.track) : undefined;
  const firstSeenAt = UnknownValue_finite(current?.firstSeenAt);
  const maxProgressMs = UnknownValue_finite(current?.maxProgressMs);
  if (currentTrack != null && firstSeenAt != null && maxProgressMs != null) {
    session.current = { track: currentTrack, firstSeenAt, maxProgressMs };
  }
  return MusicSession_dropCopies(session);
}

export function MusicLog_parse(raw: unknown): IMusicLog {
  if (!UnknownValue_isRecord(raw)) {
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
  if (r.spotifyLinked === true) {
    log.spotifyLinked = true;
  }
  if (typeof r.displayName === "string") {
    log.displayName = r.displayName;
  }
  return log;
}

export function MusicLog_session(log: IMusicLog, id: number): IMusicSession | undefined {
  return log.sessions.find((s) => s.id === id);
}

function startedDuring(session: IMusicSession, workout: IWorkoutTimes): boolean {
  return session.startedAt >= workout.startTime && session.startedAt <= (workout.endTime ?? workout.startTime);
}

// Builds before 2026-10-21 stored a running workout's session under id 0, so a session without a matching id links by time.
export function MusicLog_sessionForWorkout(log: IMusicLog, workout: IWorkoutTimes): IMusicSession | undefined {
  return MusicLog_session(log, workout.id) ?? log.sessions.find((s) => startedDuring(s, workout));
}

export function MusicLog_workoutForSession<T extends IWorkoutTimes>(
  history: T[],
  session: IMusicSession
): T | undefined {
  return history.find((h) => h.id === session.id) ?? history.find((h) => startedDuring(session, h));
}

export function MusicLog_putSession(log: IMusicLog, session: IMusicSession): IMusicLog {
  const others = log.sessions.filter((s) => s.id !== session.id);
  return {
    ...log,
    sessions: [session, ...others].sort((a, b) => b.startedAt - a.startedAt).slice(0, MusicLog_maxSessions),
  };
}

// A play is found by track and start time, because a history merge can insert an earlier play and move every index.
export function MusicLog_setKept(
  log: IMusicLog,
  sessionId: number,
  play: { trackId: string; startedAt: number },
  isKept: boolean
): IMusicLog {
  const session = MusicLog_session(log, sessionId);
  const index = session?.plays.findIndex((p) => p.track.id === play.trackId && p.startedAt === play.startedAt) ?? -1;
  if (session == null || index === -1) {
    return log;
  }
  return MusicLog_putSession(log, MusicSession_setKept(session, index, isKept));
}

export function MusicLog_workoutLookup<T extends IWorkoutTimes>(
  history: T[]
): (session: IMusicSession) => T | undefined {
  const byId = new Map<number, T>();
  history.forEach((h) => {
    if (!byId.has(h.id)) {
      byId.set(h.id, h);
    }
  });
  return (session) => byId.get(session.id) ?? history.find((h) => startedDuring(session, h));
}

export function MusicLog_sessionTitle(session: IMusicSession, dayName: string | undefined): string {
  const date = new Date(session.startedAt).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  return dayName != null ? `${date} · ${dayName}` : date;
}

export function MusicLog_saveStatus(count: number): string {
  return `Saved ${count} song${count === 1 ? "" : "s"} to Spotify.`;
}

export function MusicLog_playStatus(result: { ok: true } | { ok: false; message: string }): string {
  return result.ok ? "Playing on Spotify." : result.message;
}

export function MusicLog_reviewable(log: IMusicLog): IMusicSession[] {
  return log.sessions.filter((s) => s.plays.length > 0 || s.current != null);
}

export function MusicLog_formatDuration(ms: number): string {
  const totalSeconds = Math.round(ms / 1000);
  return `${Math.floor(totalSeconds / 60)}:${String(totalSeconds % 60).padStart(2, "0")}`;
}

export function MusicLog_disconnect(log: IMusicLog): IMusicLog {
  return { ...log, tokens: undefined, spotifyLinked: undefined, displayName: undefined };
}

export function MusicLog_sameTokens(a: ISpotifyTokens | undefined, b: ISpotifyTokens | undefined): boolean {
  if (a == null || b == null) {
    return a === b;
  }
  return a.accessToken === b.accessToken && a.refreshToken === b.refreshToken && a.expiresAt === b.expiresAt;
}

export type IMusicSecureRead = { ok: true; tokens?: ISpotifyTokens } | { ok: false };

export interface IMusicTokenStart {
  secure?: ISpotifyTokens;
  isKnown: boolean;
  deleteSecure: boolean;
  clearMarker: boolean;
}

// A failed read (the phone not unlocked since a reboot) decides nothing, so the next call reads again.
export function MusicLog_tokenStart(log: IMusicLog, read: IMusicSecureRead): IMusicTokenStart {
  const none = { isKnown: true, deleteSecure: false, clearMarker: false };
  if (!read.ok) {
    return { ...none, isKnown: false };
  }
  if (log.tokens != null) {
    return { ...none, secure: log.spotifyLinked ? read.tokens : undefined };
  }
  if (log.spotifyLinked) {
    return read.tokens != null ? { ...none, secure: read.tokens } : { ...none, clearMarker: true };
  }
  return { ...none, deleteSecure: read.tokens != null };
}

export interface IMusicTokenMove {
  tokens?: ISpotifyTokens;
  copyToSecure?: ISpotifyTokens;
}

// A token in the plain store is newer than the Keychain one: login and refresh write it there first.
export function MusicLog_tokenMove(
  plain: ISpotifyTokens | undefined,
  secure: ISpotifyTokens | undefined,
  hasSecureStore: boolean
): IMusicTokenMove {
  if (plain == null) {
    return { tokens: secure };
  }
  return hasSecureStore ? { tokens: plain, copyToSecure: plain } : { tokens: plain };
}

// A store from the old app has a token and no marker. The marker goes in before the copy starts.
export function MusicLog_markLinked(log: IMusicLog, copied: ISpotifyTokens): IMusicLog {
  return log.spotifyLinked || !MusicLog_sameTokens(log.tokens, copied) ? log : { ...log, spotifyLinked: true };
}

// The Keychain copy must read back the same before the plain one goes, so a failed write never signs the user out.
export function MusicLog_dropMovedTokens(
  log: IMusicLog,
  copied: ISpotifyTokens,
  readBack: ISpotifyTokens | undefined
): IMusicLog {
  if (!log.spotifyLinked || !MusicLog_sameTokens(copied, readBack) || !MusicLog_sameTokens(log.tokens, copied)) {
    return log;
  }
  return { ...log, tokens: undefined };
}

export function MusicLog_withTokens(log: IMusicLog, secure: ISpotifyTokens | undefined): IMusicLog {
  return log.tokens != null || secure == null || !log.spotifyLinked ? log : { ...log, tokens: secure };
}

export function MusicLog_signedOut(before: IMusicLog, after: IMusicLog): boolean {
  return before.tokens != null && after.tokens == null;
}

// While the Keychain is unread, a log without a token keeps its marker, so a music edit never signs the user out.
export function MusicLog_forPlainStore(
  next: IMusicLog,
  secure: ISpotifyTokens | undefined,
  isKnown: boolean
): IMusicLog {
  const isLinked = next.tokens != null || (!isKnown && next.spotifyLinked === true);
  const out: IMusicLog = { ...next };
  delete out.tokens;
  delete out.spotifyLinked;
  if (next.tokens != null && !MusicLog_sameTokens(next.tokens, secure)) {
    out.tokens = next.tokens;
  }
  if (isLinked) {
    out.spotifyLinked = true;
  }
  return out;
}

// The export goes to a file the user may share, so the Spotify refresh token stays on the phone.
export function MusicLog_exportJson(log: IMusicLog): string {
  return JSON.stringify({ ...log, tokens: undefined, spotifyLinked: undefined });
}
