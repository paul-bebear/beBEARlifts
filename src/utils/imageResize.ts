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

// Safari applies the EXIF rotation when it draws an <img> on a canvas, so the JPEG comes out upright.
export async function ImageResize_toJpegDataUrl(file: File, maxSide: number = maxSidePx): Promise<string> {
  const image = await loadImage(file);
  const scale = Math.min(1, maxSide / Math.max(image.naturalWidth, image.naturalHeight));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(image.naturalWidth * scale);
  canvas.height = Math.round(image.naturalHeight * scale);
  const context = canvas.getContext("2d");
  if (context == null) {
    throw new Error("The photo could not be read");
  }
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", jpegQuality);
}
