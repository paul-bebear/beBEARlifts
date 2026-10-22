import * as htmlToImage from "html-to-image";

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

function download(dataUrl: string, name: string): void {
  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export async function ShareCardImage_share(
  files: string[],
  baseName: string
): Promise<"shared" | "cancelled" | "refused"> {
  const names = files.map((_, i) => (files.length === 1 ? `${baseName}.png` : `${baseName}-${i + 1}.png`));
  const shareFiles = files.map((f, i) => toFile(f, names[i]));
  if (navigator.canShare == null || !navigator.canShare({ files: shareFiles })) {
    files.forEach((f, i) => download(f, names[i]));
    return "shared";
  }
  try {
    await navigator.share({ files: shareFiles });
    return "shared";
  } catch (e) {
    const name = (e as { name?: string }).name;
    if (name === "NotAllowedError") {
      return "refused";
    }
    if (name === "AbortError") {
      return "cancelled";
    }
    throw e;
  }
}

export async function ShareCardImage_cleanup(_files: string[]): Promise<void> {}
