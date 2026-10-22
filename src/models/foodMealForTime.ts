import { IFoodMeal } from "./foodLog";

const lunchStartsAt = 11 * 60;
const snackStartsAt = 15 * 60;
const dinnerStartsAt = 18 * 60;

export function FoodMealForTime_pick(date: Date): IFoodMeal {
  const minutes = date.getHours() * 60 + date.getMinutes();
  if (minutes < lunchStartsAt) {
    return "breakfast";
  }
  if (minutes < snackStartsAt) {
    return "lunch";
  }
  return minutes < dinnerStartsAt ? "snacks" : "dinner";
}
