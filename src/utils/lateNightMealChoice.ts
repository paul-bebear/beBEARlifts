import { ILateNightMealTargets, ILateNightMealTarget } from "../models/lateNightMeal";
import { Dialog_choice } from "./dialog";

export async function LateNightMealChoice_pick(
  choice: ILateNightMealTargets
): Promise<ILateNightMealTarget | undefined> {
  if (choice.question == null || choice.targets.length < 2) {
    return choice.targets[0];
  }
  const index = await Dialog_choice(
    "Log a meal",
    choice.question,
    choice.targets.map((t) => t.label)
  );
  return index == null ? undefined : choice.targets[index];
}
