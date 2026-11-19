import {
  IRunRecording,
  RunRecording_pause,
  RunRecording_pauseStale,
  RunRecording_restore,
  RunRecording_snapshot,
  RunRecording_start,
  RunRecording_toRun,
} from "./runRecording";
import { IRun } from "./runLog";

export type IRunFinishPhase = "idle" | "confirming" | "closing" | "finished";

export interface IRunFinishState {
  phase: IRunFinishPhase;
}

export type IRunFinishEvent =
  | { type: "tapped" }
  | { type: "answered"; confirmed: boolean }
  | { type: "saved" }
  | { type: "failed" };

export type IRunFinishEffect = { type: "ask" } | { type: "close" } | { type: "report-failure" };

export interface IRunFinishStep {
  state: IRunFinishState;
  effects: IRunFinishEffect[];
}

export type IRunSaveEffect =
  | { type: "save-run"; run: IRun }
  | { type: "alert-too-short" }
  | { type: "clear-draft" }
  | { type: "show"; run: IRun | undefined };

export type IRunStartPlan = { type: "blocked"; text: string } | { type: "begin"; recording: IRunRecording };

export interface IRunMountPlan {
  recording?: IRunRecording;
  rewriteDraft: boolean;
}

export function RunFinish_idle(): IRunFinishState {
  return { phase: "idle" };
}

export function RunFinish_isClosing(state: IRunFinishState): boolean {
  return state.phase === "closing" || state.phase === "finished";
}

export function RunFinish_next(state: IRunFinishState, event: IRunFinishEvent): IRunFinishStep {
  if (event.type === "tapped") {
    return state.phase === "idle" ? { state: { phase: "confirming" }, effects: [{ type: "ask" }] } : stay(state);
  }
  if (event.type === "answered") {
    if (state.phase !== "confirming") {
      return stay(state);
    }
    return event.confirmed
      ? { state: { phase: "closing" }, effects: [{ type: "close" }] }
      : { state: { phase: "idle" }, effects: [] };
  }
  if (state.phase !== "closing") {
    return stay(state);
  }
  return event.type === "failed"
    ? { state: { phase: "idle" }, effects: [{ type: "report-failure" }] }
    : { state: { phase: "finished" }, effects: [] };
}

function stay(state: IRunFinishState): IRunFinishStep {
  return { state, effects: [] };
}

export function RunFinish_close(
  recording: IRunRecording,
  now: number
): { recording: IRunRecording; run: IRun | undefined } {
  const closed = RunRecording_pause(RunRecording_pauseStale(recording, now), now);
  return { recording: closed, run: RunRecording_toRun(closed, now) };
}

// The run is written before the draft is cleared. A failed write throws before the clear, so the draft stays.
export function RunFinish_saveEffects(run: IRun | undefined): IRunSaveEffect[] {
  return [
    run != null ? { type: "save-run", run } : { type: "alert-too-short" },
    { type: "clear-draft" },
    { type: "show", run },
  ];
}

export function RunFinish_startPlan(blockedText: string | undefined, now: number): IRunStartPlan {
  if (blockedText != null) {
    return { type: "blocked", text: blockedText };
  }
  return { type: "begin", recording: RunRecording_snapshot(RunRecording_start(now), now) };
}

export function RunFinish_mountPlan(draft: IRunRecording | undefined): IRunMountPlan {
  const recording = draft != null ? RunRecording_restore(draft) : undefined;
  return { recording, rewriteDraft: recording != null };
}
