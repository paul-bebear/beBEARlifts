import { ISet } from "../types";
import { Weight_eq } from "./weight";

export type IFirstUseEvent = "setTap" | "crossedWeight" | "finishTap" | "programEditorOpen";

export interface IFirstUseTip {
  id: string;
  text: string;
}

const tips: Record<IFirstUseEvent, IFirstUseTip> = {
  setTap: {
    id: "tip-set-tap",
    text: "Tap the circle when a set is done. Change the numbers first if you did something else.",
  },
  crossedWeight: {
    id: "tip-crossed-weight",
    text: "The crossed-out number is the plan. The other one is what your plates can make.",
  },
  finishTap: {
    id: "tip-finish-tap",
    text: "Finish saves the workout and grows your bear.",
  },
  programEditorOpen: {
    id: "tip-program-editor",
    text: "This is the plan. Most people never change it.",
  },
};

export function FirstUseTips_next(event: IFirstUseEvent, helps: string[]): { tip?: IFirstUseTip; helps: string[] } {
  const tip = tips[event];
  return helps.includes(tip.id) ? { helps } : { tip, helps: [...helps, tip.id] };
}
export interface IFirstUseTipsState {
  tip?: IFirstUseTip;
  helps: string[];
}

export function FirstUseTips_transition(
  state: IFirstUseTipsState,
  event: IFirstUseEvent | "close",
  helps: string[]
): { state: IFirstUseTipsState; shownId?: string } {
  const seen = Array.from(new Set([...helps, ...state.helps]));
  if (event === "close") {
    return { state: { helps: seen } };
  }
  if (event === "crossedWeight" && state.tip != null) {
    return { state: { ...state, helps: seen } };
  }
  const next = FirstUseTips_next(event, seen);
  return {
    state: { helps: next.helps, tip: next.tip ?? state.tip },
    shownId: next.tip?.id,
  };
}

export function FirstUseTips_recordSeen(helps: string[], id: string): string[] {
  return helps.includes(id) ? helps : [...helps, id];
}

export function FirstUseTips_workoutEvent(
  id: number,
  entries: { sets: Pick<ISet, "isCompleted">[]; warmupSets: Pick<ISet, "isCompleted">[] }[]
): IFirstUseEvent | undefined {
  if (id !== 0) {
    return undefined;
  }
  const sets = entries.flatMap((entry) => [...entry.warmupSets, ...entry.sets]);
  return sets.some((set) => set.isCompleted) ? "finishTap" : sets.length > 0 ? "setTap" : undefined;
}

export function FirstUseTips_hasCrossedWeight(set: Pick<ISet, "weight" | "originalWeight">, setType: string): boolean {
  return setType !== "warmup" && !!set.weight && !!set.originalWeight && !Weight_eq(set.weight, set.originalWeight);
}
