import { JSX } from "react";
import { Text } from "./primitives/text";
import { IFoodProduct } from "../models/openFoodFacts";

interface IProps {
  barcode?: string;
  onSave: (product: IFoodProduct) => void;
  onBack: () => void;
}

// This fork ships only the web build. A native version would use react-native-image-picker for the photo.
export function FoodLabelPanel(_props: IProps): JSX.Element {
  return <Text className="py-6 text-base text-center">Label photos work in the web app only.</Text>;
}
