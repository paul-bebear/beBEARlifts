import { BearArt_scale } from "./bearArt";

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

// Copied from images/bear/<line>/manifest.json, in the 1024 by 1536 art canvas. test/bearScene.test.ts reads
// both manifests and fails when the art is regenerated with other anchors.
export const BearScene_canvas = { width: 1024, height: 1536 };
export const BearScene_spriteFoot = { x: 512, y: 1470 };
export const BearScene_gymFoot = { x: 512, y: 1490 };
export const BearScene_dashboardRect: IBearRect = [125, 195, 825, 675];

// Lowest row of whiteboard ink in the art canvas. Measured on the owner's iPhone screenshot of level 3: the second
// row of tiles ends 593 px down. The bear's head never goes above this line.
export const BearScene_boardInkBottom = 593;
export const BearScene_minHeightShare = 0.38;
const inLevelGrowth = 0.005;
const levelCount = 12;

const visibleBoxes: Record<string, IBearRect> = {
  "female/level-01": [260, 892, 765, 1472],
  "female/level-02": [372, 752, 652, 1472],
  "female/level-03": [361, 672, 663, 1472],
  "female/level-04": [343, 592, 680, 1472],
  "female/level-05": [285, 512, 739, 1472],
  "female/level-06": [257, 413, 768, 1472],
  "female/level-07": [244, 313, 779, 1472],
  "female/level-08": [223, 232, 801, 1472],
  "female/level-09": [205, 152, 819, 1472],
  "female/level-10": [165, 152, 858, 1472],
  "female/level-11": [190, 32, 835, 1472],
  "female/level-12": [174, 32, 851, 1472],
  "female/mood-big-hungry": [268, 233, 756, 1472],
  "female/mood-big-pumped": [209, 182, 815, 1472],
  "female/mood-big-tired": [230, 554, 795, 1472],
  "female/mood-medium-hungry": [309, 512, 715, 1472],
  "female/mood-medium-pumped": [271, 474, 753, 1472],
  "female/mood-medium-tired": [278, 763, 746, 1472],
  "female/mood-small-hungry": [378, 753, 646, 1472],
  "female/mood-small-pumped": [350, 724, 674, 1472],
  "female/mood-small-tired": [390, 940, 634, 1472],
  "female/mood-space-hungry": [243, 152, 780, 1472],
  "female/mood-space-pumped": [184, 99, 840, 1472],
  "female/mood-space-tired": [196, 495, 828, 1472],
  "male/level-01": [261, 890, 763, 1470],
  "male/level-02": [360, 750, 665, 1470],
  "male/level-03": [261, 670, 763, 1470],
  "male/level-04": [232, 589, 791, 1470],
  "male/level-05": [200, 511, 824, 1470],
  "male/level-06": [161, 410, 862, 1470],
  "male/level-07": [130, 310, 894, 1470],
  "male/level-08": [104, 229, 921, 1470],
  "male/level-09": [70, 150, 953, 1470],
  "male/level-10": [67, 151, 957, 1470],
  "male/level-11": [51, 29, 973, 1470],
  "male/level-12": [68, 28, 957, 1470],
  "male/mood-big-hungry": [142, 230, 882, 1470],
  "male/mood-big-pumped": [78, 181, 947, 1470],
  "male/mood-big-tired": [152, 552, 871, 1470],
  "male/mood-medium-hungry": [243, 509, 782, 1470],
  "male/mood-medium-pumped": [181, 472, 843, 1470],
  "male/mood-medium-tired": [220, 759, 805, 1470],
  "male/mood-small-hungry": [360, 750, 665, 1470],
  "male/mood-small-pumped": [308, 721, 717, 1470],
  "male/mood-small-tired": [299, 938, 724, 1470],
  "male/mood-space-hungry": [127, 151, 898, 1470],
  "male/mood-space-pumped": [66, 97, 957, 1470],
  "male/mood-space-tired": [147, 493, 877, 1470],
};

const headShare = 0.42;

function round(value: number): number {
  return Math.round(value * 10) / 10;
}

export function BearScene_visibleBox(spritePath: string): IBearRect {
  const key = spritePath.replace(/^\/images\/bear\//, "").replace(/\.webp$/, "");
  return visibleBoxes[key] ?? [0, 0, BearScene_canvas.width, BearScene_canvas.height];
}

// The tallest the bear gets: its feet on the gym foot line and its head on the last row of whiteboard ink.
export function BearScene_maxHeightShare(): number {
  return (BearScene_gymFoot.y - BearScene_boardInkBottom) / BearScene_canvas.height;
}

// The bear's visible height as a share of the scene height. Level 1 starts at the minimum and level 12 ends at
// the maximum. BearArt_scale moves it a little inside a level, and never past the next level's start.
export function BearScene_heightShare(level: number, fraction: number): number {
  const first = BearScene_minHeightShare;
  const last = BearScene_maxHeightShare();
  const step = (last - first - inLevelGrowth) / (levelCount - 1);
  const index = Math.max(0, Math.min(levelCount - 1, Math.round(level) - 1));
  const grown = (BearArt_scale(fraction) - BearArt_scale(0)) / (BearArt_scale(1) - BearArt_scale(0));
  return Math.min(last, first + step * index + inLevelGrowth * grown);
}

export function BearScene_layout(width: number, level: number, fraction: number, spritePath: string): IBearSceneLayout {
  const unit = width / BearScene_canvas.width;
  const [x1, y1, x2, y2] = BearScene_dashboardRect;
  const [, boxTop, , boxBottom] = BearScene_visibleBox(spritePath);
  const scale = (BearScene_heightShare(level, fraction) * BearScene_canvas.height) / Math.max(1, boxBottom - boxTop);
  return {
    width: round(width),
    height: round(BearScene_canvas.height * unit),
    sprite: {
      left: round((BearScene_gymFoot.x - BearScene_spriteFoot.x * scale) * unit),
      top: round((BearScene_gymFoot.y - boxBottom * scale) * unit),
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
