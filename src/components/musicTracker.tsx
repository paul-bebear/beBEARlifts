import { useEffect } from "react";
import {
  IMusicWorkout,
  MusicTracking_finishOthers,
  MusicTracking_mergeHistory,
  MusicTracking_observe,
  MusicTracking_pollMs,
} from "../models/musicTracking";
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

    const poll = async (): Promise<void> => {
      if (document.visibilityState !== "visible" || (await MusicStore_load()).tokens == null) {
        return;
      }
      try {
        const snapshot = await SpotifyClient_nowPlaying();
        if (!isStopped) {
          await MusicStore_update((log) => MusicTracking_observe(log, workout, snapshot, Date.now()));
        }
      } catch (e) {
        console.warn("Spotify poll failed", e);
      }
    };

    const catchUp = async (): Promise<void> => {
      if (document.visibilityState !== "visible" || (await MusicStore_load()).tokens == null) {
        return;
      }
      try {
        const history = await SpotifyClient_history();
        if (!isStopped) {
          await MusicStore_update((log) => MusicTracking_mergeHistory(log, workout, history, Date.now()));
        }
      } catch (e) {
        console.warn("Spotify history failed", e);
      }
      await poll();
    };

    catchUp();
    const interval = window.setInterval(poll, MusicTracking_pollMs);
    document.addEventListener("visibilitychange", catchUp);
    return () => {
      isStopped = true;
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", catchUp);
    };
  }, [workoutId, workoutStartTime]);

  return null;
}
