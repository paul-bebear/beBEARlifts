import { FeatureLayer_isFront, IFeature } from "./featureLayer";
import { emptyProgramId } from "./program";

export type IQuickActionId = "food" | "weight" | "run";

export interface IQuickAction {
  id: IQuickActionId;
  label: string;
  isSoon: boolean;
}

export interface IQuickActionsWorkout {
  label: string;
  action: "resume" | "bagCheck" | "pick";
}

export interface IQuickActions {
  squares: IQuickAction[];
  workout: IQuickActionsWorkout;
}

export interface IQuickActionsInput {
  isOngoingProgress: boolean;
  canRecordRun: boolean;
  isBagCheckOn?: boolean;
}

export const quickActionsSoon = "Soon";

const squareCandidates: { feature: IFeature; action: IQuickAction }[] = [
  { feature: "food", action: { id: "food", label: "Food", isSoon: false } },
  { feature: "weight", action: { id: "weight", label: "Weight", isSoon: false } },
];

const runSquare: IQuickAction = { id: "run", label: "Run", isSoon: false };

// Runs stay behind More in the feature layers, but a run is started at the door, so it gets a square here too.
export function QuickActions_list(input: IQuickActionsInput): IQuickActions {
  const front = squareCandidates.filter((c) => FeatureLayer_isFront(c.feature)).map((c) => c.action);
  return {
    squares: input.canRecordRun ? [...front, runSquare] : front,
    workout: QuickActions_workout(input),
  };
}

// The bag check needs a program day to pack for. Without one the picker opens, as before the house.
export function QuickActions_isBagCheckOn(skipBagCheck: boolean | undefined, currentProgramId?: string): boolean {
  return skipBagCheck !== true && currentProgramId != null && currentProgramId !== emptyProgramId;
}

// The "+" bar and the house door both start a workout here, so the bag check sits on one path.
export function QuickActions_workout(input: Omit<IQuickActionsInput, "canRecordRun">): IQuickActionsWorkout {
  if (input.isOngoingProgress) {
    return { label: "Resume workout", action: "resume" };
  }
  return { label: "Start workout", action: input.isBagCheckOn === true ? "bagCheck" : "pick" };
}

export function QuickActions_inProgressLine(elapsedMs: number): string {
  const minutes = Math.max(0, Math.floor(elapsedMs / 60000));
  const hours = Math.floor(minutes / 60);
  const time = hours > 0 ? `${hours} h ${minutes % 60} min` : `${minutes} min`;
  return `Workout in progress · ${time}`;
}
