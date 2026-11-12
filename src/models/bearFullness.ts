import { DailyChecklist_goalTarget } from "./dailyChecklist";
import { FoodLog_dayKey, FoodLog_dayTotals, IFoodLog } from "./foodLog";

export const BearFullness_defaultTargetCalories = 2500;

export const BearFullness_hungryBelow = 20;

export function BearFullness_targetCalories(foodLog: IFoodLog): number {
  const target = DailyChecklist_goalTarget(foodLog.goals.calories);
  return target > 0 ? target : BearFullness_defaultTargetCalories;
}

export function BearFullness_percent(foodLog: IFoodLog, now: number): number {
  const eaten = FoodLog_dayTotals(foodLog, FoodLog_dayKey(new Date(now))).calories;
  if (!Number.isFinite(eaten) || eaten <= 0) {
    return 0;
  }
  return Math.min(100, (100 * eaten) / BearFullness_targetCalories(foodLog));
}
