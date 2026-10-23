import { useEffect } from "react";
import { AppState } from "react-native";
import { IMusicWorkout, MusicTracking_finishOthers, MusicTracking_pollMs } from "../models/musicTracking";
import { IMusicPollEffects, MusicPoll_catchUp, MusicPoll_nowPlaying } from "../models/musicPoll";
import { MusicStore_load, MusicStore_update } from "../utils/musicStore";
import {
  SpotifyClient_history,
  SpotifyClient_nowPlaying,
  SpotifyClient_takeCameBackFromLogin,
} from "../utils/spotifyClient";
import { IDispatch } from "../ducks/types";
import { Thunk_pushScreen } from "../ducks/thunks";

interface IProps {
  workoutId?: number;
  workoutStartTime?: number;
  isNavReady: boolean;
  dispatch: IDispatch;
}

// On the web, react-native-web's AppState reads document.visibilityState and the visibilitychange event.
function pollEffects(isStopped: () => boolean): IMusicPollEffects {
  return {
    isVisible: () => AppState.currentState === "active",
    hasTokens: async () => (await MusicStore_load()).tokens != null,
    nowPlaying: SpotifyClient_nowPlaying,
    history: SpotifyClient_history,
    update: MusicStore_update,
    isStopped,
    now: () => Date.now(),
    warn: (message, error) => console.warn(message, error),
  };
}

export function MusicTracker(props: IProps): null {
  const { workoutId, workoutStartTime, isNavReady, dispatch } = props;

  useEffect(() => {
    if (isNavReady && SpotifyClient_takeCameBackFromLogin()) {
      dispatch(Thunk_pushScreen("music", undefined, { tab: "graphs" }));
    }
  }, [isNavReady]);

  useEffect(() => {
    MusicStore_update((log) => MusicTracking_finishOthers(log, workoutId, Date.now()));
    if (workoutId == null || workoutStartTime == null) {
      return undefined;
    }
    const workout: IMusicWorkout = { id: workoutId, startTime: workoutStartTime };
    let isStopped = false;
    const effects = pollEffects(() => isStopped);
    const poll = (): Promise<void> => MusicPoll_nowPlaying(workout, effects);
    const catchUp = (): Promise<void> => MusicPoll_catchUp(workout, effects);

    catchUp();
    const interval = setInterval(poll, MusicTracking_pollMs);
    const subscription = AppState.addEventListener("change", catchUp);
    return () => {
      isStopped = true;
      clearInterval(interval);
      subscription.remove();
    };
  }, [workoutId, workoutStartTime]);

  return null;
}
