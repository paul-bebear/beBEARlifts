import { IMusicLog, MusicLog_putSession, MusicLog_session } from "./musicLog";
import {
  IMusicSession,
  MusicSession_finish,
  MusicSession_mergeHistory,
  MusicSession_observe,
  MusicSession_start,
} from "./musicSession";
import { ISpotifyHistoryItem, ISpotifyNowPlaying } from "./spotifyTracks";
import { Progress_isCurrent } from "./progress";
import { IHistoryRecord } from "../types";

export interface IMusicWorkout {
  id: number;
  startTime: number;
}

export const MusicTracking_pollMs = 8 * 1000;

// History_finishProgramDay gives a running workout (id 0) its startTime as the id. An edited old workout plays no music.
export function MusicTracking_workoutOf(
  progress: Pick<IHistoryRecord, "id" | "startTime"> | undefined
): IMusicWorkout | undefined {
  return progress != null && Progress_isCurrent(progress)
    ? { id: progress.startTime, startTime: progress.startTime }
    : undefined;
}

function apply(log: IMusicLog, workout: IMusicWorkout, fn: (s: IMusicSession) => IMusicSession): IMusicLog {
  const existing = MusicLog_session(log, workout.id);
  const before = existing ?? MusicSession_start(workout.id, workout.startTime);
  const after = fn(before);
  if (after === existing || (existing == null && after.plays.length === 0 && after.current == null)) {
    return log;
  }
  return MusicLog_putSession(log, after);
}

export function MusicTracking_observe(
  log: IMusicLog,
  workout: IMusicWorkout,
  snapshot: ISpotifyNowPlaying | undefined,
  now: number
): IMusicLog {
  return apply(log, workout, (s) => MusicSession_observe(s, snapshot, now));
}

export function MusicTracking_mergeHistory(
  log: IMusicLog,
  workout: IMusicWorkout,
  history: ISpotifyHistoryItem[],
  now: number
): IMusicLog {
  return apply(log, workout, (s) => MusicSession_mergeHistory(s, history, now));
}

// A workout finished while the app was closed leaves its session open, so the next launch closes it.
export function MusicTracking_finishOthers(log: IMusicLog, activeId: number | undefined, now: number): IMusicLog {
  const open = log.sessions.filter((s) => s.endedAt == null && s.id !== activeId);
  return open.reduce((acc, s) => MusicLog_putSession(acc, MusicSession_finish(s, now)), log);
}
