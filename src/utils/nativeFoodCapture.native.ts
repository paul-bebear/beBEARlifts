import { launchCamera, launchImageLibrary } from "react-native-image-picker";
import { IFoodCapturePhoto, IFoodCaptureSource, IFoodLabelEvent } from "../models/foodCapture";
import { AiConsent_ensure } from "./aiConsentClient";
import { FoodApi_readLabel } from "./foodApi";
import { FoodCapture_mealPhoto, FoodCapture_label, IFoodCaptureDependencies } from "./foodCaptureRequest";
import { ImagePicker_ensureCameraPermission } from "./imagePicker.native";

const dependencies: IFoodCaptureDependencies = {
  allow: AiConsent_ensure,
  cameraPermission: ImagePicker_ensureCameraPermission,
  pick: (source, options) => (source === "camera" ? launchCamera(options) : launchImageLibrary(options)),
  readLabel: FoodApi_readLabel,
};

export function NativeFoodCapture_mealPhoto(source: IFoodCaptureSource): Promise<IFoodCapturePhoto> {
  return FoodCapture_mealPhoto(source, dependencies);
}

export function NativeFoodCapture_label(source: IFoodCaptureSource): Promise<IFoodLabelEvent> {
  return FoodCapture_label(source, dependencies);
}
