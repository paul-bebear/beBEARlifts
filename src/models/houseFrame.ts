import { BearScene_canvas, BearScene_gymArt, IBearRect, IBearSceneArt } from "./bearScene";

export interface IHouseFrameBox {
  width: number;
  height: number;
}

export interface IHouseFrameInsets {
  top: number;
  bottom: number;
}

export interface IHouseFrameFit {
  scale: number;
  left: number;
  top: number;
  width: number;
  height: number;
  sideColorWidth: number;
}

// The room and gym pictures grew from 1024 by 1536 to 1024 by 2304. The old picture sits unchanged at rows
// 448 to 1984, with 448 rows of ceiling painted above it and 320 rows of floor below. HOUSE_HOME_PLAN.md has the
// numbers.
export const HouseFrame_canvas = { width: 1024, height: 2304 };
export const HouseFrame_oldTop = 448;
const oldHeight = BearScene_canvas.height;

function round(value: number): number {
  return Math.round(value * 10) / 10;
}

// The old 1536 rows always fit whole. Rows that do not fit leave from the ceiling first and from the floor only
// once all 448 ceiling rows are gone. A screen wider than the art shows the wall colour on both sides.
export function HouseFrame_fit(box: IHouseFrameBox): IHouseFrameFit {
  const scale = Math.min(box.width / HouseFrame_canvas.width, box.height / oldHeight);
  const width = HouseFrame_canvas.width * scale;
  const height = HouseFrame_canvas.height * scale;
  const extra = height - box.height;
  const top = extra >= 0 ? -Math.min(extra, HouseFrame_oldTop * scale) : -extra / 2;
  const left = (box.width - width) / 2;
  return {
    scale,
    left: round(left),
    top: round(top),
    width: round(width),
    height: round(height),
    sideColorWidth: round(Math.max(0, left)),
  };
}

// The part of the canvas the user sees between the status bar and the home indicator.
export function HouseFrame_safeRect(fit: IHouseFrameFit, box: IHouseFrameBox, insets: IHouseFrameInsets): IBearRect {
  const toCanvas = (screen: number): number => (screen - fit.top) / fit.scale;
  const clampX = (x: number): number => Math.max(0, Math.min(HouseFrame_canvas.width, x));
  const clampY = (y: number): number => Math.max(0, Math.min(HouseFrame_canvas.height, y));
  return [
    round(clampX(-fit.left / fit.scale)),
    round(clampY(toCanvas(insets.top))),
    round(clampX((box.width - fit.left) / fit.scale)),
    round(clampY(toCanvas(box.height - insets.bottom))),
  ];
}

// Moves a scene measured on the old 1024 by 1536 picture onto the tall canvas.
export function HouseFrame_tall(art: IBearSceneArt): IBearSceneArt {
  const [x1, y1, x2, y2] = art.board;
  return {
    canvas: HouseFrame_canvas,
    foot: { x: art.foot.x, y: art.foot.y + HouseFrame_oldTop },
    minHeightShare: art.minHeightShare,
    board: [x1, y1 + HouseFrame_oldTop, x2, y2 + HouseFrame_oldTop],
    inkBottom: art.inkBottom + HouseFrame_oldTop,
  };
}

export const HouseFrame_gymArt: IBearSceneArt = HouseFrame_tall(BearScene_gymArt);

function luminance(hex: string): number {
  const channel = (at: number): number => {
    const c = parseInt(hex.slice(at, at + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5);
}

// The status bar draws over the ceiling, so its text takes whichever of white or black contrasts more with the
// wall colour, by the WCAG contrast ratio.
export function HouseFrame_statusBarStyle(wall: string): "light-content" | "dark-content" {
  const l = luminance(wall);
  return 1.05 / (l + 0.05) >= (l + 0.05) / 0.05 ? "light-content" : "dark-content";
}
