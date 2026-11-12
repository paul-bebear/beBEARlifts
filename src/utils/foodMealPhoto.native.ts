import { IFoodCapturePhoto, IFoodCaptureSource } from "../models/foodCapture";
import { NativeFoodCapture_mealPhoto } from "./nativeFoodCapture.native";

export function FoodMealPhoto_pick(source: IFoodCaptureSource): Promise<IFoodCapturePhoto> {
  return NativeFoodCapture_mealPhoto(source);
}
