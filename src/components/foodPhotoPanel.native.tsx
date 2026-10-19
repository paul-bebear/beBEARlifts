import { JSX } from "react";
import { Text } from "./primitives/text";
import { IFoodMeal } from "../models/foodLog";
import { IFoodPhotoChoice } from "../models/foodAddFlow";

interface IProps {
  meal: IFoodMeal;
  onSubmit: (choices: IFoodPhotoChoice[], meal: IFoodMeal) => void;
}

// This fork ships only the web build. A native version would use react-native-image-picker for the photo.
export function FoodPhotoPanel(_props: IProps): JSX.Element {
  return <Text className="py-6 text-base text-center">Plate photos work in the web app only.</Text>;
}
