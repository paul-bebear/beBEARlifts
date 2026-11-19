import { ProgressPhotos_maxSide } from "../models/progressPhotos";
import { ImageResize_toJpegDataUrl } from "./imageResize";
import { WebFilePick_image } from "./webFilePick";

export async function ProgressPhotoPick_pick(source: "camera" | "photo-library"): Promise<string | undefined> {
  const file = await WebFilePick_image({ capture: source === "camera" ? "user" : undefined });
  return file == null ? undefined : ImageResize_toJpegDataUrl(file, ProgressPhotos_maxSide);
}
