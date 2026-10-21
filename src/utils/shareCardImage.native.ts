import RNFS from "react-native-fs";
import Share from "react-native-share";
import { captureRef } from "react-native-view-shot";
import NativeImageResizer from "../specs/NativeLiftosaurImageResizer";

const width = 1080;
const height = 1920;

export const ShareCardImage_prepareAhead = false;

function toPath(uri: string): string {
  return decodeURIComponent(uri.replace(/^file:\/\//, ""));
}

// iOS reads captureRef's width and height as points and multiplies by the screen scale, so a 3x phone would
// give 3240x5760. Capture at the screen's own size, then resize to exactly 1080x1920.
export async function ShareCardImage_capture(view: unknown): Promise<string> {
  const raw = await captureRef(view as Parameters<typeof captureRef>[0], {
    format: "png",
    quality: 1,
    result: "tmpfile",
  });
  const rawUri = raw.startsWith("file://") ? raw : `file://${raw}`;
  try {
    return await NativeImageResizer.drawToCanvas(rawUri, width, height, 0, 0, width, height, "png", 1, 0);
  } finally {
    await ShareCardImage_cleanup([rawUri]);
  }
}

export async function ShareCardImage_share(
  files: string[],
  baseName: string
): Promise<"shared" | "cancelled" | "refused"> {
  try {
    const result = await Share.open({
      urls: files,
      type: "image/png",
      filename: baseName,
      failOnCancel: false,
    });
    return result.success === false && result.dismissedAction === true ? "cancelled" : "shared";
  } catch (e) {
    const message = (e as { message?: string }).message ?? "";
    if (/cancel|user did not share/i.test(message)) {
      return "cancelled";
    }
    throw e;
  }
}

export async function ShareCardImage_cleanup(files: string[]): Promise<void> {
  for (const file of files) {
    const path = toPath(file);
    if (!path.startsWith(RNFS.CachesDirectoryPath) && !path.startsWith(RNFS.TemporaryDirectoryPath)) {
      continue;
    }
    try {
      if (await RNFS.exists(path)) {
        await RNFS.unlink(path);
      }
    } catch {
      // A leftover file in the caches folder is removed by iOS later; it must not fail the share.
    }
  }
}
