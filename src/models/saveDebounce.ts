export const SaveDebounce_quietMs = 400;

export interface ISaveDebounce<T> {
  pending?: { value: T };
  isHeld: boolean;
}

export type ISaveDebounceEffect<T> =
  | { kind: "startTimer"; ms: number }
  | { kind: "clearTimer" }
  | { kind: "save"; value: T };

export interface ISaveDebounceStep<T> {
  state: ISaveDebounce<T>;
  effects: ISaveDebounceEffect<T>[];
}

export function SaveDebounce_empty<T>(): ISaveDebounce<T> {
  return { isHeld: false };
}

// After a failed save the timer stops, so a full disk costs one failed write, not one per pause in typing.
export function SaveDebounce_type<T>(state: ISaveDebounce<T>, value: T): ISaveDebounceStep<T> {
  const next = { ...state, pending: { value } };
  return { state: next, effects: state.isHeld ? [] : [{ kind: "startTimer", ms: SaveDebounce_quietMs }] };
}

export function SaveDebounce_flush<T>(state: ISaveDebounce<T>): ISaveDebounceStep<T> {
  if (state.pending == null) {
    return { state, effects: [] };
  }
  return {
    state: { ...state, pending: undefined },
    effects: [{ kind: "clearTimer" }, { kind: "save", value: state.pending.value }],
  };
}

export function SaveDebounce_saved<T>(state: ISaveDebounce<T>): ISaveDebounceStep<T> {
  const next = { ...state, isHeld: false };
  return { state: next, effects: next.pending != null ? [{ kind: "startTimer", ms: SaveDebounce_quietMs }] : [] };
}

export function SaveDebounce_failed<T>(state: ISaveDebounce<T>, value: T): ISaveDebounceStep<T> {
  return { state: { pending: state.pending ?? { value }, isHeld: true }, effects: [] };
}

export function SaveDebounce_discard<T>(state: ISaveDebounce<T>): ISaveDebounceStep<T> {
  return { state: { ...state, pending: undefined }, effects: [{ kind: "clearTimer" }] };
}

export interface ISaveDebounceTimers {
  set: (run: () => void, ms: number) => unknown;
  clear: (handle: unknown) => void;
}

export interface ISaveDebounceController<T> {
  type: (value: T) => void;
  flush: () => void;
  discard: () => void;
}

export function SaveDebounce_controller<T>(
  save: (value: T) => Promise<void>,
  timers: ISaveDebounceTimers = {
    set: (run, ms) => setTimeout(run, ms),
    clear: (handle) => clearTimeout(handle as never),
  }
): ISaveDebounceController<T> {
  let state = SaveDebounce_empty<T>();
  let handle: unknown;

  function apply(step: ISaveDebounceStep<T>): void {
    state = step.state;
    for (const effect of step.effects) {
      if (effect.kind === "clearTimer" || effect.kind === "startTimer") {
        if (handle != null) {
          timers.clear(handle);
          handle = undefined;
        }
      }
      if (effect.kind === "startTimer") {
        handle = timers.set(() => {
          handle = undefined;
          apply(SaveDebounce_flush(state));
        }, effect.ms);
      } else if (effect.kind === "save") {
        const { value } = effect;
        save(value).then(
          () => apply(SaveDebounce_saved(state)),
          () => apply(SaveDebounce_failed(state, value))
        );
      }
    }
  }

  return {
    type: (value) => apply(SaveDebounce_type(state, value)),
    flush: () => apply(SaveDebounce_flush(state)),
    discard: () => apply(SaveDebounce_discard(state)),
  };
}
