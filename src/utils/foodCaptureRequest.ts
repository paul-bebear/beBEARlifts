import type { ImagePickerResponse } from "react-native-image-picker";
import {
  FoodCapture_options,
  FoodCapture_photo,
  IFoodCaptureKind,
  IFoodCapturePhoto,
  IFoodCaptureSource,
  IFoodCaptureResult,
  IFoodPhotoEvent,
  IFoodLabelEvent,
} from "../models/foodCapture";
import { IFoodPhotoEstimate } from "../models/foodPhotoEstimate";
import { INutritionLabel } from "../models/nutritionLabel";

export interface IFoodCaptureDependencies {
  allow: () => Promise<boolean>;
  cameraPermission: () => Promise<boolean>;
  pick: (source: IFoodCaptureSource, options: ReturnType<typeof FoodCapture_options>) => Promise<ImagePickerResponse>;
  estimate: (photo: string, note?: string) => Promise<IFoodCaptureResult<IFoodPhotoEstimate>>;
  readLabel: (photo: string) => Promise<IFoodCaptureResult<INutritionLabel>>;
}

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

export async function FoodCapture_meal(
  source: IFoodCaptureSource,
  note: string,
  deps: IFoodCaptureDependencies
): Promise<IFoodPhotoEvent> {
  try {
    const photo = await FoodCapture_pick("meal", source, deps);
    if (photo.kind !== "photo") {
      return photo.kind === "error" ? { type: "failed", error: photo.error } : { type: "cancelled" };
    }
    return { type: "estimated", photo: photo.dataUrl, result: await deps.estimate(photo.dataUrl, note) };
  } catch {
    return { type: "failed", error: "The photo could not be read. Try another one." };
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
    return { type: "failed", error: "The photo could not be read. Try another one." };
  }
}
