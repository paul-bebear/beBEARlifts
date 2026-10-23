export type IQuickActionId = "food" | "weight" | "friend" | "note";

export interface IQuickAction {
  id: IQuickActionId;
  label: string;
  isSoon: boolean;
}

export interface IQuickActionsWorkout {
  label: string;
  action: "resume" | "pick";
  showsRun: boolean;
}

export interface IQuickActions {
  squares: IQuickAction[];
  workout: IQuickActionsWorkout;
}

export interface IQuickActionsInput {
  isOngoingProgress: boolean;
  canRun: boolean;
}

export const quickActionsSoon = "Soon";
export const quickActionsRun = "Run";

export function QuickActions_list(input: IQuickActionsInput): IQuickActions {
  return {
    squares: [
      { id: "food", label: "Food", isSoon: false },
      { id: "weight", label: "Weight", isSoon: false },
      { id: "friend", label: "Friend", isSoon: false },
      { id: "note", label: "Note", isSoon: false },
    ],
    workout: {
      label: input.isOngoingProgress ? "Resume workout" : "Start workout",
      action: input.isOngoingProgress ? "resume" : "pick",
      showsRun: input.canRun,
    },
  };
}

export function QuickActions_inProgressLine(elapsedMs: number): string {
  const minutes = Math.max(0, Math.floor(elapsedMs / 60000));
  const hours = Math.floor(minutes / 60);
  const time = hours > 0 ? `${hours} h ${minutes % 60} min` : `${minutes} min`;
  return `Workout in progress · ${time}`;
}
