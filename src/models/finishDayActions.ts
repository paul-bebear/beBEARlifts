export type IFinishDayAction = "photo" | "share" | "music";

export interface IFinishDayActionsInput {
  musicEnabled: boolean;
  exportAvailable: boolean;
}

export function FinishDayActions_list(input: IFinishDayActionsInput): IFinishDayAction[] {
  const actions: IFinishDayAction[] = ["photo"];
  if (input.exportAvailable) {
    actions.push("share");
  }
  if (input.musicEnabled) {
    actions.push("music");
  }
  return actions;
}
