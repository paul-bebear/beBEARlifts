import { JSX } from "react";
import { Text } from "./primitives/text";
import { IFoodPhotoChoice } from "../models/foodAddFlow";

interface IProps {
  initialNote?: string;
  onAdd: (choices: IFoodPhotoChoice[]) => void;
}

// This fork ships only the web build. A native version would use react-native-image-picker for the photo.
export function FoodPhotoPanel(_props: IProps): JSX.Element {
  return <Text className="py-6 text-base text-center">Plate photos work in the web app only.</Text>;
}
