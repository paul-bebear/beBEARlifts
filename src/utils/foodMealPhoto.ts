import { IFoodCapturePhoto, IFoodCaptureSource } from "../models/foodCapture";
import { ImageResize_toJpegDataUrl } from "./imageResize";
import { WebFilePick_image } from "./webFilePick";

export async function FoodMealPhoto_pick(source: IFoodCaptureSource): Promise<IFoodCapturePhoto> {
  const file = await WebFilePick_image({
    capture: source === "camera" ? "environment" : undefined,
    testId: source === "camera" ? "food-photo-camera-input" : "food-photo-library-input",
  });
  if (file == null) {
    return { kind: "cancelled" };
  }
  const dataUrl = await ImageResize_toJpegDataUrl(file).catch(() => undefined);
  return dataUrl == null
    ? { kind: "error", error: "The photo could not be read. Try another one." }
    : { kind: "photo", dataUrl };
}
