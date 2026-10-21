import { launchCamera, launchImageLibrary } from "react-native-image-picker";
import { IFoodCaptureSource, IFoodPhotoEvent, IFoodLabelEvent } from "../models/foodCapture";
import { AiConsent_ensure } from "./aiConsentClient";
import { FoodApi_estimatePhoto, FoodApi_readLabel } from "./foodApi";
import { FoodCapture_meal, FoodCapture_label, IFoodCaptureDependencies } from "./foodCaptureRequest";
import { ImagePicker_ensureCameraPermission } from "./imagePicker.native";

const dependencies: IFoodCaptureDependencies = {
  allow: AiConsent_ensure,
  cameraPermission: ImagePicker_ensureCameraPermission,
  pick: (source, options) => (source === "camera" ? launchCamera(options) : launchImageLibrary(options)),
  estimate: FoodApi_estimatePhoto,
  readLabel: FoodApi_readLabel,
};

export function NativeFoodCapture_meal(source: IFoodCaptureSource, note: string): Promise<IFoodPhotoEvent> {
  return FoodCapture_meal(source, note, dependencies);
}

export function NativeFoodCapture_label(source: IFoodCaptureSource): Promise<IFoodLabelEvent> {
  return FoodCapture_label(source, dependencies);
}
