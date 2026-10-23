import "mocha";
import { expect } from "chai";
import * as fs from "fs";
import * as path from "path";
import sharp from "sharp";
import {
  BearScene_bodyCrop,
  BearScene_breathing,
  BearScene_breathingPivot,
  BearScene_boardInkBottom,
  BearScene_canvas,
  BearScene_dashboardRect,
  BearScene_gymFoot,
  BearScene_headCrop,
  BearScene_heightShare,
  BearScene_layout,
  BearScene_maxHeightShare,
  BearScene_minHeightShare,
  BearScene_spriteFoot,
  BearScene_visibleBox,
  IBearSceneLayout,
} from "../src/models/bearScene";
import { BearArt_sprite } from "../src/models/bearArt";
import { BearTv_rect } from "../src/models/bearTv";
import { IBearMood } from "../src/models/bear";
import { IBearLine } from "../src/models/bearStoreData";

const lines: IBearLine[] = ["male", "female"];
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
  const sprite = BearArt_sprite(line, level, mood);
  const layout = BearScene_layout(width, level, fraction, sprite);
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
  it("keeps all 24 wardrobe bounds in sync with the manifest, WebP alpha and native map", async () => {
    const root = path.join(__dirname, "..");
    const wardrobe = JSON.parse(fs.readFileSync(path.join(root, "images/bear/wardrobe-manifest.json"), "utf8")) as {
      assets: { sex: string; stage: string; outfit: string; visible_bbox_alpha_gt_8: number[] }[];
    };
    const nativeMap = fs.readFileSync(path.join(root, "src/utils/bearImage.native.ts"), "utf8");
    expect(wardrobe.assets).to.have.length(24);
    for (const asset of wardrobe.assets) {
      const line = asset.sex === "m" ? "male" : "female";
      const sprite = `/images/bear/${line}/outfit-${asset.stage}-${asset.outfit}.webp`;
      const file = path.join(root, sprite);
      expect(BearScene_visibleBox(sprite)).to.deep.equal(asset.visible_bbox_alpha_gt_8);
      expect(fs.statSync(file).size).to.be.lessThan(80000);
      expect(nativeMap).to.include(`"${sprite}": require("../..${sprite}")`);
      const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
      expect([info.width, info.height, info.channels]).to.deep.equal([512, 768, 4]);
      const bounds = [info.width, info.height, 0, 0];
      for (let y = 0; y < info.height; y += 1) {
        for (let x = 0; x < info.width; x += 1) {
          if (data[(y * info.width + x) * 4 + 3] > 8) {
            bounds[0] = Math.min(bounds[0], x);
            bounds[1] = Math.min(bounds[1], y);
            bounds[2] = Math.max(bounds[2], x + 1);
            bounds[3] = Math.max(bounds[3], y + 1);
          }
        }
      }
      bounds.forEach((value, i) => expect(value * 2, sprite).to.be.closeTo(asset.visible_bbox_alpha_gt_8[i], 2));
    }
    for (const line of lines) {
      expect(
        fs.readdirSync(path.join(root, "images/bear", line)).filter((file) => file.startsWith("outfit-"))
      ).to.have.length(12);
    }
    const nativeKeys = [...nativeMap.matchAll(/^  "([^\"]+)": require/gm)].map((match) => match[1]);
    expect(nativeKeys).to.deep.equal([...nativeKeys].sort());
  });

  it("keeps outfit feet fixed and every body stage below the board during a full breath", () => {
    for (const line of lines) {
      for (const [stage, levels] of [
        ["teen", [2, 3]],
        ["mid", [4, 5]],
        ["fit", [6, 7]],
        ["peak", [8, 9]],
      ] as const) {
        for (const outfit of ["gym", "fitted", "baggy"]) {
          const sprite = `/images/bear/${line}/outfit-${stage}-${outfit}.webp`;
          for (const level of levels) {
            for (const width of [iPhoneSeWidth, 390, 480]) {
              const layout = BearScene_layout(width, level, 1, sprite, 1.015);
              const [, top, , bottom] = BearScene_visibleBox(sprite);
              const scale = layout.sprite.height / BearScene_canvas.height;
              const foot = layout.sprite.top + bottom * scale;
              expect(foot).to.be.closeTo((width * BearScene_gymFoot.y) / 1024, 0.3);
              expect(foot - (bottom - top) * scale * 1.015).to.be.at.least(
                (width * BearScene_boardInkBottom) / 1024 - 0.3
              );
            }
          }
        }
      }
    }
  });

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
          const spritePath = BearArt_sprite(line, level, mood);
          const breathing = BearScene_breathing(mood);
          const layout = BearScene_layout(390, level, 1, spritePath, breathing.scaleY);
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
            const spritePath = BearArt_sprite(line, level, mood);
            const breathing = BearScene_breathing(mood);
            const layout = BearScene_layout(width, level, 1, spritePath, breathing.scaleY);
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

  it("matches the visible boxes in both manifests", () => {
    for (const line of ["male", "female"]) {
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
    for (const line of ["male", "female"] as const) {
      for (let level = 1; level <= 12; level += 1) {
        for (const mood of ["normal", "hungry", "tired", "pumped"] as const) {
          expect(BearScene_visibleBox(BearArt_sprite(line, level, mood))[2]).to.be.lessThan(1024);
        }
      }
    }
  });

  it("sizes the bear from its visible height, not from the full canvas", () => {
    const layout = BearScene_layout(1024, 1, 0, "/images/bear/male/level-01.webp");
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
    expect(BearScene_visibleBox(BearArt_sprite("male", 3, "tired"))).to.not.deep.equal(
      BearScene_visibleBox(BearArt_sprite("male", 3, "normal"))
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
