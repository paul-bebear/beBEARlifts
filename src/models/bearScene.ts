import { IBearMood } from "./bear";

export type IBearRect = [number, number, number, number];

export interface IBearBox {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface IBearSceneLayout {
  width: number;
  height: number;
  sprite: IBearBox;
  board: IBearBox;
}

export const BearScene_canvas = { width: 1024, height: 1536 };
export const BearScene_spriteFoot = { x: 512, y: 1470 };
export const BearScene_gymFoot = { x: 512, y: 1490 };
export const BearScene_dashboardRect: IBearRect = [125, 195, 825, 675];

// The new art holds the size inside the canvas: level 1 is 580 rows tall and level 12 is 1442. One sprite pixel is
// 0.62 scene pixels at every level, so the bear grows because the art does.
export const BearScene_spriteScale = 0.62;

export interface IBearSceneArt {
  canvas: { width: number; height: number };
  foot: { x: number; y: number };
  board: IBearRect;
  inkBottom: number;
}

// Lowest row of whiteboard ink in the gym picture, measured on the owner's iPhone screenshot of level 3.
export const BearScene_boardInkBottom = 593;
export const BearScene_gymArt: IBearSceneArt = {
  canvas: BearScene_canvas,
  foot: BearScene_gymFoot,
  board: BearScene_dashboardRect,
  inkBottom: BearScene_boardInkBottom,
};

// Copied from images/bear/brown/manifest.json, in the 1024 by 1536 art canvas. test/bearScene.test.ts reads the
// manifest and fails when scripts/realistic-bear-art.py writes other boxes.
const visibleBoxes: Record<string, IBearRect> = {
  "level-01": [335, 890, 689, 1470],
  "level-02": [309, 770, 685, 1470],
  "level-03": [293, 680, 720, 1471],
  "level-04": [268, 600, 716, 1471],
  "level-05": [258, 520, 757, 1470],
  "level-06": [183, 430, 825, 1470],
  "level-07": [141, 340, 874, 1470],
  "level-08": [105, 261, 906, 1471],
  "level-09": [79, 190, 926, 1469],
  "level-10": [82, 130, 912, 1471],
  "level-11": [53, 70, 944, 1471],
  "level-12": [35, 28, 969, 1471],
  "mood-small-hungry": [246, 805, 779, 1471],
  "mood-small-tired": [221, 1155, 803, 1471],
  "mood-small-pumped": [323, 560, 711, 1471],
  "mood-medium-hungry": [207, 567, 817, 1471],
  "mood-medium-tired": [111, 1042, 916, 1470],
  "mood-medium-pumped": [297, 235, 738, 1471],
  "mood-big-hungry": [59, 320, 966, 1469],
  "mood-big-tired": [41, 925, 983, 1470],
  "mood-big-pumped": [180, 30, 850, 1471],
  "mood-space-hungry": [38, 198, 986, 1471],
  "mood-space-tired": [103, 867, 1022, 1471],
  "mood-space-pumped": [108, 30, 928, 1470],
};

const headShare = 0.42;

function round(value: number): number {
  return Math.round(value * 10) / 10;
}

export function BearScene_visibleBox(spritePath: string): IBearRect {
  const key = spritePath.replace(/^\/images\/bear\/brown\//, "").replace(/\.webp$/, "");
  return visibleBoxes[key] ?? [0, 0, BearScene_canvas.width, BearScene_canvas.height];
}

export type IBearScenePlace = "home" | "gym";

export function BearScene_place(isOngoingProgress: boolean): IBearScenePlace {
  return isOngoingProgress ? "gym" : "home";
}

export function BearScene_breathing(mood: IBearMood): { durationMs: number; scaleY: number } {
  const durations: Record<IBearMood, number> = { normal: 3500, hungry: 3500, tired: 7000, pumped: 2500 };
  return { durationMs: durations[mood], scaleY: 1.015 };
}

export function BearScene_breathingPivot(spritePath: string, height: number): number {
  const [, , , bottom] = BearScene_visibleBox(spritePath);
  return height * (bottom / BearScene_canvas.height - 0.5);
}

export function BearScene_layout(width: number, art: IBearSceneArt): IBearSceneLayout {
  const unit = width / art.canvas.width;
  const [x1, y1, x2, y2] = art.board;
  const scale = BearScene_spriteScale;
  return {
    width: round(width),
    height: round(art.canvas.height * unit),
    sprite: {
      left: round((art.foot.x - BearScene_spriteFoot.x * scale) * unit),
      top: round((art.foot.y - BearScene_spriteFoot.y * scale) * unit),
      width: round(BearScene_canvas.width * scale * unit),
      height: round(BearScene_canvas.height * scale * unit),
    },
    board: {
      left: round(x1 * unit),
      top: round(y1 * unit),
      width: round((x2 - x1) * unit),
      height: round((y2 - y1) * unit),
    },
  };
}

export function BearScene_bodyCrop(spritePath: string, height: number): { width: number; image: IBearBox } {
  const [x1, y1, x2, y2] = BearScene_visibleBox(spritePath);
  const unit = height / Math.max(1, y2 - y1);
  return {
    width: round((x2 - x1) * unit),
    image: {
      left: round(-x1 * unit),
      top: round(-y1 * unit),
      width: round(BearScene_canvas.width * unit),
      height: round(BearScene_canvas.height * unit),
    },
  };
}

// The head sits at the top of the visible box on every sprite, so a square from that edge, centred
// on the box, frames it.
export function BearScene_headCrop(spritePath: string, size: number): IBearBox {
  const [x1, y1, x2, y2] = BearScene_visibleBox(spritePath);
  const side = Math.max(1, (y2 - y1) * headShare);
  const unit = size / side;
  const left = (x1 + x2) / 2 - side / 2;
  const top = y1 - side * 0.04;
  return {
    left: round(-left * unit),
    top: round(-top * unit),
    width: round(BearScene_canvas.width * unit),
    height: round(BearScene_canvas.height * unit),
  };
}
