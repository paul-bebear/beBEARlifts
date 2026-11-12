import type { ImagePickerResponse } from "react-native-image-picker";
import {
  FoodCapture_options,
  FoodCapture_photo,
  IFoodCaptureKind,
  IFoodCapturePhoto,
  IFoodCaptureSource,
  IFoodCaptureResult,
  IFoodLabelEvent,
} from "../models/foodCapture";
import { INutritionLabel } from "../models/nutritionLabel";

export interface IFoodCaptureDependencies {
  allow: () => Promise<boolean>;
  cameraPermission: () => Promise<boolean>;
  pick: (source: IFoodCaptureSource, options: ReturnType<typeof FoodCapture_options>) => Promise<ImagePickerResponse>;
  readLabel: (photo: string) => Promise<IFoodCaptureResult<INutritionLabel>>;
}

const unreadablePhotoMessage = "The photo could not be read. Try another one.";

async function FoodCapture_pick(
  kind: IFoodCaptureKind,
  source: IFoodCaptureSource,
  deps: IFoodCaptureDependencies
): Promise<IFoodCapturePhoto> {
  if (!(await deps.allow())) {
    return { kind: "cancelled" };
  }
  if (source === "camera" && !(await deps.cameraPermission())) {
    return { kind: "error", error: "Allow camera access in your phone's Settings, then try again." };
  }
  return FoodCapture_photo(await deps.pick(source, FoodCapture_options(kind)));
}

export async function FoodCapture_mealPhoto(
  source: IFoodCaptureSource,
  deps: IFoodCaptureDependencies
): Promise<IFoodCapturePhoto> {
  try {
    return await FoodCapture_pick("meal", source, deps);
  } catch {
    return { kind: "error", error: unreadablePhotoMessage };
  }
}

export async function FoodCapture_label(
  source: IFoodCaptureSource,
  deps: IFoodCaptureDependencies
): Promise<IFoodLabelEvent> {
  try {
    const photo = await FoodCapture_pick("label", source, deps);
    if (photo.kind !== "photo") {
      return photo.kind === "error" ? { type: "failed", error: photo.error } : { type: "cancelled" };
    }
    return { type: "read", result: await deps.readLabel(photo.dataUrl) };
  } catch {
    return { type: "failed", error: unreadablePhotoMessage };
  }
}
