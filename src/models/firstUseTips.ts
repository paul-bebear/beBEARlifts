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
