import { FeatureLayer_isFront, IFeature } from "./featureLayer";

export type IQuickActionId = "food" | "weight";

export interface IQuickAction {
  id: IQuickActionId;
  label: string;
  isSoon: boolean;
}

export interface IQuickActionsWorkout {
  label: string;
  action: "resume" | "pick";
}

export interface IQuickActions {
  squares: IQuickAction[];
  workout: IQuickActionsWorkout;
}

export interface IQuickActionsInput {
  isOngoingProgress: boolean;
}

export const quickActionsSoon = "Soon";

const squareCandidates: { feature: IFeature; action: IQuickAction }[] = [
  { feature: "food", action: { id: "food", label: "Food", isSoon: false } },
  { feature: "weight", action: { id: "weight", label: "Weight", isSoon: false } },
];

export function QuickActions_list(input: IQuickActionsInput): IQuickActions {
  return {
    squares: squareCandidates.filter((c) => FeatureLayer_isFront(c.feature)).map((c) => c.action),
    workout: {
      label: input.isOngoingProgress ? "Resume workout" : "Start workout",
      action: input.isOngoingProgress ? "resume" : "pick",
    },
  };
}

export function QuickActions_inProgressLine(elapsedMs: number): string {
  const minutes = Math.max(0, Math.floor(elapsedMs / 60000));
  const hours = Math.floor(minutes / 60);
  const time = hours > 0 ? `${hours} h ${minutes % 60} min` : `${minutes} min`;
  return `Workout in progress · ${time}`;
}
