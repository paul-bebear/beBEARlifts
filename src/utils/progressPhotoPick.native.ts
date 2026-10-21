import RNFS from "react-native-fs";
import NativeImageResizer from "../specs/NativeLiftosaurImageResizer";
import { ProgressPhotos_fitSize } from "../models/progressPhotos";
import { ImagePicker_pick } from "./imagePicker";

const jpegQuality = 0.8;

// The picker hands back a temporary file. The photo is shrunk and stored as a data URL, so it outlives that file.
export async function ProgressPhotoPick_pick(source: "camera" | "photo-library"): Promise<string | undefined> {
  const uri = await ImagePicker_pick(source);
  if (uri == null) {
    return undefined;
  }
  const size = await NativeImageResizer.getSize(uri);
  const fit = ProgressPhotos_fitSize(size.width, size.height);
  const resizedUri = await NativeImageResizer.drawToCanvas(
    uri,
    fit.width,
    fit.height,
    0,
    0,
    fit.width,
    fit.height,
    "jpeg",
    jpegQuality,
    0
  );
  const base64 = await RNFS.readFile(decodeURIComponent(resizedUri.replace(/^file:\/\//, "")), "base64");
  return `data:image/jpeg;base64,${base64}`;
}
