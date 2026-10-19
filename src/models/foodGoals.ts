import { IFoodGoals, IFoodRange } from "./foodLog";

export type IFoodGoalsForm = Record<keyof IFoodGoals, { min: string; max: string }>;

const keys: (keyof IFoodGoals)[] = ["calories", "protein", "carbs", "fat"];

export function FoodGoals_toForm(goals: IFoodGoals): IFoodGoalsForm {
  const form = {} as IFoodGoalsForm;
  for (const key of keys) {
    form[key] = { min: `${goals[key].min}`, max: `${goals[key].max}` };
  }
  return form;
}

function parseRange(range: { min: string; max: string }): IFoodRange | undefined {
  const min = Number(range.min.trim());
  const max = range.max.trim() === "" ? min : Number(range.max.trim());
  if (range.min.trim() === "" || !isFinite(min) || !isFinite(max) || min < 0 || max < min) {
    return undefined;
  }
  return { min: Math.round(min), max: Math.round(max) };
}

export function FoodGoals_parseForm(form: IFoodGoalsForm): IFoodGoals | undefined {
  const goals = {} as IFoodGoals;
  for (const key of keys) {
    const range = parseRange(form[key]);
    if (range == null) {
      return undefined;
    }
    goals[key] = range;
  }
  return goals;
}
