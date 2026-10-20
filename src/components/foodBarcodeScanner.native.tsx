import { JSX } from "react";
import { Text } from "./primitives/text";

interface IProps {
  onDetected: (code: string) => void;
}

// The web scanner needs @zxing/browser and a <video> element. NATIVE_PLAN.md has the react-native-vision-camera fix.
export function FoodBarcodeScanner(_props: IProps): JSX.Element {
  return <Text className="py-6 text-base text-center">Barcode scanning works in the web app only.</Text>;
}
