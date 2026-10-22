import { IBearLevel } from "./bearTier";

export interface IShareCardBearFrame {
  width: number;
  height: number;
  imageWidth: number;
  imageHeight: number;
  imageCrop: number;
}

const canvasAspect = 1.5;

// Share of the 1024x1536 canvas above each size's tallest pumped pose (small 721px, medium 472px, big 181px,
// space 97px, both lines, from images/bear/*/manifest.json), less room for a barbell held overhead.
const cropTop: Record<IBearLevel["size"], number> = { small: 0.3, medium: 0.18, big: 0.04, space: 0 };

export function ShareCardBear_frame(size: IBearLevel["size"], height: number): IShareCardBearFrame {
  const imageHeight = height / (1 - cropTop[size]);
  const imageWidth = Math.round(imageHeight / canvasAspect);
  return {
    width: imageWidth,
    height,
    imageWidth,
    imageHeight: Math.round(imageHeight),
    imageCrop: Math.round(imageHeight * cropTop[size]),
  };
}
