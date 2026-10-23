import { IExerciseType, ISettings } from "../types";
import { Exercise_get, Exercise_synergistMuscles, Exercise_targetMuscles } from "./exercise";

const lightRampWarmup = 10;

export function WarmupSkip_isAlreadyWarm(
  exercise: IExerciseType,
  earlierExercises: IExerciseType[],
  settings: ISettings
): boolean {
  if (Exercise_get(exercise, settings.exercises).defaultWarmup !== lightRampWarmup) {
    return false;
  }
  const targets = Exercise_targetMuscles(exercise, settings);
  return earlierExercises.some((earlier) =>
    [...Exercise_targetMuscles(earlier, settings), ...Exercise_synergistMuscles(earlier, settings)].some((muscle) =>
      targets.includes(muscle)
    )
  );
}
