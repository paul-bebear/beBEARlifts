import { IBearLevel } from "./bearTier";

export interface IShareCardBearFrame {
  width: number;
  height: number;
  imageWidth: number;
  imageHeight: number;
  imageCrop: number;
}

const canvasAspect = 1.5;

// Share of the 1024x1536 canvas above each size's pumped roar (small 560px, medium 235px, big 30px, space 30px,
// from images/bear/brown/manifest.json), less a 20 to 30 px margin. The roar is the only pose the cards show.
export const ShareCardBear_cropTop: Record<IBearLevel["size"], number> = {
  small: 0.35,
  medium: 0.14,
  big: 0.005,
  space: 0.005,
};

export function ShareCardBear_frame(size: IBearLevel["size"], height: number): IShareCardBearFrame {
  const imageHeight = height / (1 - ShareCardBear_cropTop[size]);
  const imageWidth = Math.round(imageHeight / canvasAspect);
  return {
    width: imageWidth,
    height,
    imageWidth,
    imageHeight: Math.round(imageHeight),
    imageCrop: Math.round(imageHeight * ShareCardBear_cropTop[size]),
  };
}
