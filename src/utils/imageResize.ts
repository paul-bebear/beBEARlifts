const maxSidePx = 1024;
const jpegQuality = 0.8;

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("The photo could not be read"));
    };
    image.src = url;
  });
}

export function ImageResize_scaledSize(
  width: number,
  height: number,
  maxSide: number
): { width: number; height: number } {
  if (width <= 0 || height <= 0) {
    throw new Error("The photo could not be read");
  }
  const scale = Math.min(1, maxSide / Math.max(width, height));
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

// Safari applies the EXIF rotation when it draws an <img> on a canvas, so the JPEG comes out upright.
export async function ImageResize_toJpegDataUrl(file: File, maxSide: number = maxSidePx): Promise<string> {
  const image = await loadImage(file);
  const size = ImageResize_scaledSize(image.naturalWidth, image.naturalHeight, maxSide);
  const canvas = document.createElement("canvas");
  canvas.width = size.width;
  canvas.height = size.height;
  const context = canvas.getContext("2d");
  if (context == null) {
    throw new Error("The photo could not be read");
  }
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", jpegQuality);
}
