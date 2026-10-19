import { JSX } from "react";
import { Text } from "./primitives/text";

interface IProps {
  onDetected: (code: string) => void;
}

// This fork ships only the web build. A native scanner would need a camera library such as react-native-vision-camera.
export function FoodBarcodeScanner(_props: IProps): JSX.Element {
  return <Text className="py-6 text-base text-center">Barcode scanning works in the web app only.</Text>;
}
