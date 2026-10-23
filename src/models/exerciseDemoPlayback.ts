import { ExerciseDemos_posterFrame, IExerciseDemoMedia } from "./exerciseDemos";

export interface IExerciseDemoPlayback {
  load: "loading" | "ready" | "failed";
  frame: number;
  reduceMotion: boolean;
  // undefined until the user taps play or pause. Then their choice beats the reduce motion setting.
  userWantsPlay?: boolean;
}

export type IExerciseDemoPlaybackEvent =
  | { type: "loaded" }
  | { type: "failed" }
  | { type: "tick" }
  | { type: "toggled" }
  | { type: "reduceMotion"; enabled: boolean };

export function ExerciseDemoPlayback_initial(media: IExerciseDemoMedia): IExerciseDemoPlayback {
  return { load: "loading", frame: ExerciseDemos_posterFrame(media), reduceMotion: false };
}

export function ExerciseDemoPlayback_isPlaying(state: IExerciseDemoPlayback): boolean {
  return state.load === "ready" && (state.userWantsPlay ?? !state.reduceMotion);
}

export function ExerciseDemoPlayback_reduce(
  media: IExerciseDemoMedia,
  state: IExerciseDemoPlayback,
  event: IExerciseDemoPlaybackEvent
): IExerciseDemoPlayback {
  switch (event.type) {
    case "loaded":
      return state.load === "loading" ? { ...state, load: "ready" } : state;
    case "failed":
      return { ...state, load: "failed" };
    case "tick":
      return ExerciseDemoPlayback_isPlaying(state) ? { ...state, frame: (state.frame + 1) % media.frames } : state;
    case "toggled":
      return state.load === "ready" ? { ...state, userWantsPlay: !ExerciseDemoPlayback_isPlaying(state) } : state;
    case "reduceMotion": {
      const next = { ...state, reduceMotion: event.enabled };
      return event.enabled && state.userWantsPlay == null ? { ...next, frame: ExerciseDemos_posterFrame(media) } : next;
    }
  }
}

export function ExerciseDemoPlayback_delayMs(
  media: IExerciseDemoMedia,
  state: IExerciseDemoPlayback
): number | undefined {
  return ExerciseDemoPlayback_isPlaying(state) ? media.frameMs[state.frame] : undefined;
}
