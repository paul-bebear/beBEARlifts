import { ProgressPhotos_maxSide } from "../models/progressPhotos";
import { ImageResize_toJpegDataUrl } from "./imageResize";

function pickFile(source: "camera" | "photo-library"): Promise<File | undefined> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    if (source === "camera") {
      input.capture = "user";
    }
    input.onchange = () => resolve(input.files?.[0]);
    input.oncancel = () => resolve(undefined);
    input.click();
  });
}

export async function ProgressPhotoPick_pick(source: "camera" | "photo-library"): Promise<string | undefined> {
  const file = await pickFile(source);
  return file == null ? undefined : ImageResize_toJpegDataUrl(file, ProgressPhotos_maxSide);
}
