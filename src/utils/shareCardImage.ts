import * as htmlToImage from "html-to-image";
import { FileShare_download, FileShare_share } from "./fileShare";

const options = { pixelRatio: 3, width: 360, height: 640 };

// iOS Safari refuses navigator.share when it starts after an await, so the web prepares the images before the tap.
export const ShareCardImage_prepareAhead = true;

// html-to-image inlines images and fonts on the first pass; Safari can omit them without a warm-up render.
export async function ShareCardImage_capture(view: unknown): Promise<string> {
  const element = view as HTMLElement;
  await htmlToImage.toPng(element, options);
  return htmlToImage.toPng(element, options);
}

function toFile(dataUrl: string, name: string): File {
  const [header, base64] = dataUrl.split(",");
  const type = header.match(/:(.*?);/)?.[1] ?? "image/png";
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new File([bytes], name, { type });
}

export async function ShareCardImage_share(
  files: string[],
  baseName: string
): Promise<"shared" | "cancelled" | "refused"> {
  const shareFiles = files.map((f, i) =>
    toFile(f, files.length === 1 ? `${baseName}.png` : `${baseName}-${i + 1}.png`)
  );
  const result = await FileShare_share(shareFiles, navigator);
  if (result === "unavailable") {
    shareFiles.forEach(FileShare_download);
    return "shared";
  }
  return result;
}

export async function ShareCardImage_cleanup(_files: string[]): Promise<void> {}
