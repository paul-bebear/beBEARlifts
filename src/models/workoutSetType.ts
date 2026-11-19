import type { IProgressMode } from "../types";
import type { IPlannerProgramExercise } from "../pages/planner/models/types";

export type IWorkoutSetType = "program" | "warmup" | "adhoc";

export function WorkoutSetType_isAdhoc(
  isCurrentProgress: boolean,
  programExercise: IPlannerProgramExercise | undefined
): boolean {
  return isCurrentProgress && programExercise == null;
}

export function WorkoutSetType_decide(
  mode: IProgressMode,
  isCurrentProgress: boolean,
  programExercise: IPlannerProgramExercise | undefined
): IWorkoutSetType {
  if (mode === "warmup") {
    return "warmup";
  }
  return WorkoutSetType_isAdhoc(isCurrentProgress, programExercise) ? "adhoc" : "program";
}
