import "mocha";
import { expect } from "chai";
import * as fs from "fs";
import * as path from "path";
import {
  BearScene_bodyCrop,
  BearScene_breathing,
  BearScene_breathingPivot,
  BearScene_boardInkBottom,
  BearScene_canvas,
  BearScene_dashboardRect,
  BearScene_gymArt,
  BearScene_gymFoot,
  BearScene_headCrop,
  BearScene_heightShare,
  BearScene_layout,
  BearScene_maxHeightShare,
  BearScene_minHeightShare,
  BearScene_place,
  BearScene_spriteFoot,
  BearScene_visibleBox,
  IBearSceneLayout,
} from "../src/models/bearScene";
import { BearArt_sprite } from "../src/models/bearArt";
import { BearTv_rect } from "../src/models/bearTv";
import { BearHouse_art } from "../src/models/bearHouse";
import { HouseFrame_gymArt, HouseFrame_oldTop } from "../src/models/houseFrame";
import { IBearMood } from "../src/models/bear";
import { IBearFur, IBearLine } from "../src/models/bearStoreData";

const lines: IBearLine[] = ["male", "female"];
const furs: IBearFur[] = ["brown", "black", "polar"];
const folders = lines.flatMap((line) => furs.map((fur) => (fur === "brown" ? line : `${line}-${fur}`)));
const moods: IBearMood[] = ["normal", "hungry", "tired", "pumped"];
const iPhoneSeWidth = 343;

function placed(
  width: number,
  level: number,
  fraction: number,
  line: IBearLine,
  mood: IBearMood
): {
  layout: IBearSceneLayout;
  top: number;
  bottom: number;
  left: number;
  right: number;
} {
  const sprite = BearArt_sprite(line, "brown", level, mood);
  const layout = BearScene_layout(width, BearScene_gymArt, level, fraction, sprite);
  const [x1, y1, x2, y2] = BearScene_visibleBox(sprite);
  const scaleX = layout.sprite.width / BearScene_canvas.width;
  const scaleY = layout.sprite.height / BearScene_canvas.height;
  return {
    layout,
    top: layout.sprite.top + y1 * scaleY,
    bottom: layout.sprite.top + y2 * scaleY,
    left: layout.sprite.left + x1 * scaleX,
    right: layout.sprite.left + x2 * scaleX,
  };
}

interface IManifestAsset {
  name?: string;
  kind: string;
  visible_bbox: number[];
}

function manifest(
  line: string
): Record<string, unknown> & { assets: IManifestAsset[] | Record<string, IManifestAsset> } {
  const file = path.join(__dirname, "..", "images", "bear", line, "manifest.json");
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function spriteKey(line: string, assetName: string): string {
  return `/images/bear/${line}/${assetName
    .replace(/^bear_(f_)?/, "")
    .replace(/\.png$/, "")
    .replace(/_/g, "-")}.webp`;
}

describe("BearScene", () => {
  it("breathes at the requested speed for each mood", () => {
    expect(BearScene_breathing("normal")).to.deep.equal({ durationMs: 3500, scaleY: 1.015 });
    expect(BearScene_breathing("hungry")).to.deep.equal(BearScene_breathing("normal"));
    expect(BearScene_breathing("tired")).to.deep.equal({ durationMs: 7000, scaleY: 1.015 });
    expect(BearScene_breathing("pumped")).to.deep.equal({ durationMs: 2500, scaleY: 1.015 });
  });

  it("keeps the visible feet fixed throughout a breath on both lines", () => {
    for (const line of lines) {
      for (let level = 1; level <= 12; level += 1) {
        for (const mood of moods) {
          const spritePath = BearArt_sprite(line, "brown", level, mood);
          const breathing = BearScene_breathing(mood);
          const layout = BearScene_layout(390, BearScene_gymArt, level, 1, spritePath, breathing.scaleY);
          const [, , , bottom] = BearScene_visibleBox(spritePath);
          const foot = (bottom / BearScene_canvas.height) * layout.sprite.height;
          const center = layout.sprite.height / 2;
          const pivot = BearScene_breathingPivot(spritePath, layout.sprite.height);
          for (const scaleY of [1, 1.0075, breathing.scaleY]) {
            const transformedFoot = center + pivot + scaleY * (foot - center - pivot);
            expect(transformedFoot, `${line} ${level} ${mood}`).to.be.closeTo(foot, 1e-9);
            expect(layout.sprite.top + transformedFoot).to.be.closeTo((390 * BearScene_gymFoot.y) / 1024, 0.3);
          }
        }
      }
    }
  });

  it("leaves room above the tallest bear for a full breath", () => {
    for (const line of lines) {
      for (let level = 1; level <= 12; level += 1) {
        for (const mood of moods) {
          for (const width of [iPhoneSeWidth, 390, 480]) {
            const spritePath = BearArt_sprite(line, "brown", level, mood);
            const breathing = BearScene_breathing(mood);
            const layout = BearScene_layout(width, BearScene_gymArt, level, 1, spritePath, breathing.scaleY);
            const [, top, , bottom] = BearScene_visibleBox(spritePath);
            const foot = (bottom / BearScene_canvas.height) * layout.sprite.height;
            const visibleHeight = ((bottom - top) / BearScene_canvas.height) * layout.sprite.height;
            const inhaledTop = layout.sprite.top + foot - visibleHeight * breathing.scaleY;
            expect(inhaledTop, `${line} ${level} ${mood}`).to.be.at.least(
              (BearScene_boardInkBottom * width) / BearScene_canvas.width - 0.3
            );
          }
        }
      }
    }
  });

  it("matches the anchors in the male manifest", () => {
    const m = manifest("male") as Record<string, unknown>;
    const placement = m.scene_placement as { scale: number; full_canvas_top_left: number[]; foot_anchor: number[] };
    expect(m.canvas).to.deep.equal([BearScene_canvas.width, BearScene_canvas.height]);
    expect(m.bear_foot_anchor).to.deep.equal([BearScene_spriteFoot.x, BearScene_spriteFoot.y]);
    expect(placement.foot_anchor).to.deep.equal([BearScene_gymFoot.x, BearScene_gymFoot.y]);
    expect(m.dashboard_safe_rect).to.deep.equal(BearScene_dashboardRect);
  });

  it("matches the visible boxes in all six manifests", () => {
    for (const line of folders) {
      const assets = manifest(line).assets;
      const list = Array.isArray(assets)
        ? assets.map((a) => [a.name!, a] as const)
        : Object.entries(assets).map(([name, a]) => [name, a] as const);
      const bears = list.filter(([, a]) => a.kind !== "gym");
      expect(bears.length).to.equal(24);
      for (const [name, asset] of bears) {
        expect(BearScene_visibleBox(spriteKey(line, name))).to.deep.equal(asset.visible_bbox);
      }
    }
  });

  it("has a box for every sprite path the app asks for", () => {
    for (const line of lines) {
      for (const fur of furs) {
        for (let level = 1; level <= 12; level += 1) {
          for (const mood of ["normal", "hungry", "tired", "pumped"] as const) {
            expect(BearScene_visibleBox(BearArt_sprite(line, fur, level, mood))[2]).to.be.lessThan(1024);
          }
        }
      }
    }
  });

  it("gives a black or polar sprite the box of the brown one", () => {
    for (const line of lines) {
      for (const fur of ["black", "polar"] as const) {
        expect(BearScene_visibleBox(BearArt_sprite(line, fur, 7, "hungry"))).to.deep.equal(
          BearScene_visibleBox(BearArt_sprite(line, "brown", 7, "hungry"))
        );
      }
    }
  });

  it("keeps every anchor of the brown manifest in the black and polar manifests", () => {
    const anchors = ["canvas", "bear_foot_anchor", "scene_placement", "dashboard_safe_rect", "tv_safe_rect"];
    for (const line of lines) {
      const brown = manifest(line);
      for (const fur of ["black", "polar"] as const) {
        const recolour = manifest(`${line}-${fur}`);
        for (const key of anchors) {
          expect(recolour[key], `${line}-${fur} ${key}`).to.deep.equal(brown[key]);
        }
      }
    }
  });

  it("sizes the bear from its visible height, not from the full canvas", () => {
    const layout = BearScene_layout(1024, BearScene_gymArt, 1, 0, "/images/bear/male/level-01.webp");
    expect([layout.width, layout.height]).to.deep.equal([1024, 1536]);
    expect(layout.sprite.width / layout.sprite.height).to.be.closeTo(1024 / 1536, 0.001);
    expect(layout.board).to.deep.equal({ left: 125, top: 195, width: 700, height: 480 });
    const bear = placed(1024, 1, 0, "male", "normal");
    expect(bear.bottom - bear.top).to.be.closeTo(0.38 * 1536, 0.5);
  });

  it("starts the cub at 38 percent of the scene and ends level 12 at the maximum", () => {
    expect(BearScene_minHeightShare).to.equal(0.38);
    expect(BearScene_heightShare(1, 0)).to.equal(0.38);
    expect(BearScene_heightShare(12, 1)).to.be.closeTo(BearScene_maxHeightShare(), 1e-9);
    expect(BearScene_maxHeightShare()).to.be.within(0.58, 0.6);
  });

  it("gives the bear's height as a share of the scene at levels 1, 3, 6, 9 and 12 on both lines", () => {
    const expected: Record<number, number> = { 1: 0.38, 3: 0.416, 6: 0.47, 9: 0.525, 12: 0.579 };
    for (const line of lines) {
      for (const level of [1, 3, 6, 9, 12]) {
        for (const width of [iPhoneSeWidth, 390, 480]) {
          const bear = placed(width, level, 0, line, "normal");
          const share = (bear.bottom - bear.top) / bear.layout.height;
          expect(share, `${line} level ${level} width ${width}`).to.be.closeTo(expected[level], 0.003);
          expect(share).to.be.at.least(0.38 - 0.0005);
        }
      }
    }
  });

  it("grows level by level, and a level-up is bigger than the growth inside a level", () => {
    for (let level = 1; level < 12; level += 1) {
      const endOfLevel = BearScene_heightShare(level, 1);
      const startOfNext = BearScene_heightShare(level + 1, 0);
      expect(startOfNext - endOfLevel, `level ${level} to ${level + 1}`).to.be.greaterThan(0.01);
      expect(BearScene_heightShare(level, 1)).to.be.greaterThan(BearScene_heightShare(level, 0));
    }
  });

  it("keeps the feet on the gym foot line at every level, mood and fraction", () => {
    for (const line of lines) {
      for (let level = 1; level <= 12; level += 1) {
        for (const mood of moods) {
          for (const fraction of [0, 0.5, 1]) {
            const bear = placed(390, level, fraction, line, mood);
            expect(bear.bottom, `${line} ${level} ${mood}`).to.be.closeTo((390 * BearScene_gymFoot.y) / 1024, 0.3);
            expect((bear.left + bear.right) / 2).to.be.closeTo((390 * BearScene_gymFoot.x) / 1024, 25);
          }
        }
      }
    }
  });

  it("never covers the whiteboard numbers or the TV, at any level, mood or width", () => {
    const inkBottom = (width: number): number => (BearScene_boardInkBottom * width) / BearScene_canvas.width;
    const tvBottom = (width: number): number => (BearTv_rect[3] * width) / BearScene_canvas.width;
    expect(BearScene_boardInkBottom).to.be.greaterThan(BearTv_rect[3]);
    for (const line of lines) {
      for (let level = 1; level <= 12; level += 1) {
        for (const mood of moods) {
          for (const width of [iPhoneSeWidth, 390, 430, 480]) {
            const bear = placed(width, level, 1, line, mood);
            const label = `${line} level ${level} ${mood} width ${width}`;
            expect(bear.top, label).to.be.at.least(inkBottom(width) - 0.2);
            expect(bear.top, label).to.be.at.least(tvBottom(width));
            expect(bear.left, label).to.be.at.least(0);
            expect(bear.right, label).to.be.at.most(width);
          }
        }
      }
    }
  });

  it("keeps the same visible height when the mood changes", () => {
    for (const line of lines) {
      for (const level of [1, 3, 6, 9, 12]) {
        const normal = placed(390, level, 0.4, line, "normal");
        for (const mood of ["hungry", "tired", "pumped"] as const) {
          const other = placed(390, level, 0.4, line, mood);
          expect(other.bottom - other.top, `${line} level ${level} ${mood}`).to.be.closeTo(
            normal.bottom - normal.top,
            0.3
          );
        }
      }
    }
  });

  it("uses the tired sprite's own bounds, so its lower head still lands on the same foot line", () => {
    const tired = placed(390, 3, 0, "male", "tired");
    const normal = placed(390, 3, 0, "male", "normal");
    expect(BearScene_visibleBox(BearArt_sprite("male", "brown", 3, "tired"))).to.not.deep.equal(
      BearScene_visibleBox(BearArt_sprite("male", "brown", 3, "normal"))
    );
    expect(tired.bottom).to.be.closeTo(normal.bottom, 0.2);
    expect(tired.layout.sprite.width).to.not.equal(normal.layout.sprite.width);
  });

  it("keeps the bear below the board on an iPhone SE", () => {
    const bear = placed(iPhoneSeWidth, 12, 1, "male", "pumped");
    expect(bear.layout.height).to.be.closeTo(514.5, 0.1);
    expect(bear.top).to.be.at.least(198);
    expect((bear.bottom - bear.top) / bear.layout.height).to.be.closeTo(BearScene_maxHeightShare(), 0.003);
  });

  it("fits the visible body to a height", () => {
    const crop = BearScene_bodyCrop("/images/bear/male/level-01.webp", 145);
    expect(crop.width).to.equal(125.5);
    expect(crop.image).to.deep.equal({ left: -65.2, top: -222.5, width: 256, height: 384 });
  });

  it("frames the top of the visible box for the head", () => {
    const crop = BearScene_headCrop("/images/bear/male/level-01.webp", 56);
    const side = (1470 - 890) * 0.42;
    expect(crop.width).to.be.closeTo((1024 * 56) / side, 0.1);
    expect(crop.top).to.be.lessThan(0);
    expect(-crop.left + 28).to.be.closeTo(((261 + 763) / 2) * (56 / side), 0.2);
  });
});

describe("BearScene_place", () => {
  it("puts the bear in the gym while a workout runs and at home the rest of the time", () => {
    expect(BearScene_place(true)).to.equal("gym");
    expect(BearScene_place(false)).to.equal("home");
  });

  it("stands the bear on the house floor below the board at every level", () => {
    const unit = 390 / BearHouse_art.canvas.width;
    for (const level of [1, 6, 12]) {
      const sprite = BearArt_sprite("male", "brown", level, "normal");
      const layout = BearScene_layout(390, BearHouse_art, level, 1, sprite, 1.015);
      const [, y1, , y2] = BearScene_visibleBox(sprite);
      const scale = layout.sprite.height / BearScene_canvas.height;
      expect(layout.height).to.be.closeTo(877.5, 0.1);
      expect(layout.sprite.top + y2 * scale).to.be.closeTo(BearHouse_art.foot.y * unit, 0.2);
      expect(layout.sprite.top + y1 * scale).to.be.at.least(BearHouse_art.inkBottom * unit - 0.2);
    }
    expect(BearScene_heightShare(1, 0, BearHouse_art)).to.equal(0.26);
  });
});

describe("BearScene on the tall canvas", () => {
  it("draws the bear at the same size and 448 rows lower than on the old gym picture", () => {
    for (const line of lines) {
      for (const level of [1, 6, 12]) {
        for (const mood of moods) {
          const sprite = BearArt_sprite(line, "brown", level, mood);
          const old = BearScene_layout(1024, BearScene_gymArt, level, 0.5, sprite, 1.015);
          const tall = BearScene_layout(1024, HouseFrame_gymArt, level, 0.5, sprite, 1.015);
          const label = `${line} ${level} ${mood}`;
          expect(tall.height, label).to.equal(2304);
          expect(tall.sprite.width, label).to.equal(old.sprite.width);
          expect(tall.sprite.height, label).to.equal(old.sprite.height);
          expect(tall.sprite.left, label).to.equal(old.sprite.left);
          expect(tall.sprite.top, label).to.be.closeTo(old.sprite.top + HouseFrame_oldTop, 0.1);
          expect(tall.board.top, label).to.equal(old.board.top + HouseFrame_oldTop);
        }
      }
    }
  });

  it("scales the tall scene to the width the frame gives it", () => {
    const sprite = BearArt_sprite("male", "brown", 6, "normal");
    const layout = BearScene_layout(393, HouseFrame_gymArt, 6, 0, sprite);
    expect(layout.width).to.equal(393);
    expect(layout.height).to.be.closeTo((2304 * 393) / 1024, 0.1);
    expect(layout.board.top).to.be.closeTo((643 * 393) / 1024, 0.1);
  });
});
