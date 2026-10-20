import { JSX } from "react";
import { Text } from "./primitives/text";
import { IFoodProduct } from "../models/openFoodFacts";

interface IProps {
  barcode?: string;
  onSave: (product: IFoodProduct) => void;
  onBack: () => void;
}

// The web panel needs <input type="file"> and a canvas. NATIVE_PLAN.md has the react-native-image-picker fix.
export function FoodLabelPanel(_props: IProps): JSX.Element {
  return <Text className="py-6 text-base text-center">Label photos work in the web app only.</Text>;
}
