import { JSX } from "react";
import { Text } from "./primitives/text";
import { IFoodPhotoChoice } from "../models/foodAddFlow";

interface IProps {
  initialNote?: string;
  onAdd: (choices: IFoodPhotoChoice[]) => void;
}

// The web panel needs <input type="file"> and a canvas. NATIVE_PLAN.md has the react-native-image-picker fix.
export function FoodPhotoPanel(_props: IProps): JSX.Element {
  return <Text className="py-6 text-base text-center">Plate photos work in the web app only.</Text>;
}
