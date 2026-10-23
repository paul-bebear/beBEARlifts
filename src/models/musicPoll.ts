import { IMusicLog } from "./musicLog";
import { IMusicWorkout, MusicTracking_mergeHistory, MusicTracking_observe } from "./musicTracking";
import { ISpotifyHistoryItem, ISpotifyNowPlaying } from "./spotifyTracks";

export interface IMusicPollEffects {
  isVisible: () => boolean;
  hasTokens: () => Promise<boolean>;
  nowPlaying: () => Promise<ISpotifyNowPlaying | undefined>;
  history: () => Promise<ISpotifyHistoryItem[]>;
  update: (fn: (log: IMusicLog) => IMusicLog) => Promise<unknown>;
  isStopped: () => boolean;
  now: () => number;
  warn: (message: string, error: unknown) => void;
}

function canPoll(effects: IMusicPollEffects): Promise<boolean> {
  return effects.isVisible() ? effects.hasTokens() : Promise.resolve(false);
}

export async function MusicPoll_nowPlaying(workout: IMusicWorkout, effects: IMusicPollEffects): Promise<void> {
  if (!(await canPoll(effects))) {
    return;
  }
  try {
    const snapshot = await effects.nowPlaying();
    if (!effects.isStopped()) {
      await effects.update((log) => MusicTracking_observe(log, workout, snapshot, effects.now()));
    }
  } catch (e) {
    effects.warn("Spotify poll failed", e);
  }
}

export async function MusicPoll_catchUp(workout: IMusicWorkout, effects: IMusicPollEffects): Promise<void> {
  if (!(await canPoll(effects))) {
    return;
  }
  try {
    const history = await effects.history();
    if (!effects.isStopped()) {
      await effects.update((log) => MusicTracking_mergeHistory(log, workout, history, effects.now()));
    }
  } catch (e) {
    effects.warn("Spotify history failed", e);
  }
  await MusicPoll_nowPlaying(workout, effects);
}
