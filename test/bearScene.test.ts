import "mocha";
import { expect } from "chai";
import * as fs from "fs";
import * as path from "path";
import {
  BearScene_bodyCrop,
  BearScene_breathing,
  BearScene_breathingPivot,
  BearScene_canvas,
  BearScene_dashboardRect,
  BearScene_gymArt,
  BearScene_gymFoot,
  BearScene_headCrop,
  BearScene_layout,
  BearScene_place,
  BearScene_spriteFoot,
  BearScene_spriteScale,
  BearScene_visibleBox,
  IBearRect,
  IBearSceneArt,
} from "../src/models/bearScene";
import { BearArt_sprite } from "../src/models/bearArt";
import { HouseFrame_gymArt, HouseFrame_oldTop } from "../src/models/houseFrame";
import { IBearMood } from "../src/models/bear";

const moods: IBearMood[] = ["normal", "hungry", "tired", "pumped"];
const iPhoneSeWidth = 343;
const widths = [iPhoneSeWidth, 390, 430, 480];
const cabinArt: IBearSceneArt = {
  canvas: { width: 1024, height: 2304 },
  foot: { x: 512, y: 1620 },
  board: [32, 190, 992, 650],
  inkBottom: 650,
};

interface IManifestAsset {
  kind: string;
  visible_bbox: number[];
  visible_height: number;
}

function brownManifest(): { canvas: number[]; bear_foot_anchor: number[]; assets: Record<string, IManifestAsset> } {
  const file = path.join(__dirname, "..", "images", "bear", "brown", "manifest.json");
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function spritePaths(): string[] {
  const paths: string[] = [];
  for (let level = 1; level <= 12; level += 1) {
    for (const mood of moods) {
      paths.push(BearArt_sprite("male", "brown", level, mood));
    }
  }
  return paths;
}

function placedTop(width: number, spritePath: string): number {
  const layout = BearScene_layout(width, cabinArt);
  const [, y1] = BearScene_visibleBox(spritePath);
  return layout.sprite.top + y1 * BearScene_spriteScale * (width / cabinArt.canvas.width);
}

describe("BearScene", () => {
  it("breathes at the requested speed for each mood", () => {
    expect(BearScene_breathing("normal")).to.deep.equal({ durationMs: 3500, scaleY: 1.015 });
    expect(BearScene_breathing("hungry")).to.deep.equal(BearScene_breathing("normal"));
    expect(BearScene_breathing("tired")).to.deep.equal({ durationMs: 7000, scaleY: 1.015 });
    expect(BearScene_breathing("pumped")).to.deep.equal({ durationMs: 2500, scaleY: 1.015 });
  });

  it("draws every sprite at the fixed scale 0.62, with the sprite foot on the scene foot", () => {
    const layout = BearScene_layout(1024, cabinArt);
    expect(BearScene_spriteScale).to.equal(0.62);
    expect(layout.width).to.equal(1024);
    expect(layout.height).to.equal(2304);
    expect(layout.sprite.width).to.be.closeTo(1024 * 0.62, 0.1);
    expect(layout.sprite.height).to.be.closeTo(1536 * 0.62, 0.1);
    expect(layout.sprite.left + BearScene_spriteFoot.x * 0.62).to.be.closeTo(cabinArt.foot.x, 0.1);
    expect(layout.sprite.top + BearScene_spriteFoot.y * 0.62).to.be.closeTo(cabinArt.foot.y, 0.1);
    expect(layout.board).to.deep.equal({ left: 32, top: 190, width: 960, height: 460 });
  });

  it("scales the scene with the width the frame gives it", () => {
    const layout = BearScene_layout(393, cabinArt);
    expect(layout.height).to.be.closeTo((2304 * 393) / 1024, 0.1);
    expect(layout.sprite.top + BearScene_spriteFoot.y * 0.62 * (393 / 1024)).to.be.closeTo((1620 * 393) / 1024, 0.2);
  });

  it("keeps the visible feet fixed throughout a breath", () => {
    for (const spritePath of spritePaths()) {
      const breathing = BearScene_breathing("normal");
      const layout = BearScene_layout(390, cabinArt);
      const [, , , bottom] = BearScene_visibleBox(spritePath);
      const foot = (bottom / BearScene_canvas.height) * layout.sprite.height;
      const center = layout.sprite.height / 2;
      const pivot = BearScene_breathingPivot(spritePath, layout.sprite.height);
      for (const scaleY of [1, 1.0075, breathing.scaleY]) {
        const transformedFoot = center + pivot + scaleY * (foot - center - pivot);
        expect(transformedFoot, spritePath).to.be.closeTo(foot, 1e-9);
      }
      expect(layout.sprite.top + foot, spritePath).to.be.closeTo((390 * cabinArt.foot.y) / 1024, 0.5);
    }
  });

  it("keeps the top of every sprite below the whiteboard, even at the top of a breath", () => {
    const tallest = 1470 - 28;
    expect(cabinArt.foot.y - tallest * BearScene_spriteScale).to.be.closeTo(726, 1);
    for (const spritePath of spritePaths()) {
      for (const width of widths) {
        const unit = width / cabinArt.canvas.width;
        const [, top, , bottom] = BearScene_visibleBox(spritePath);
        const inhale = placedTop(width, spritePath) - (bottom - top) * BearScene_spriteScale * unit * 0.015;
        expect(placedTop(width, spritePath), `${spritePath} ${width}`).to.be.at.least(cabinArt.inkBottom * unit);
        expect(inhale, `${spritePath} ${width}`).to.be.at.least(cabinArt.inkBottom * unit);
      }
    }
  });

  it("keeps every sprite inside the screen width", () => {
    for (const spritePath of spritePaths()) {
      for (const width of widths) {
        const layout = BearScene_layout(width, cabinArt);
        const scale = layout.sprite.width / BearScene_canvas.width;
        const [x1, , x2] = BearScene_visibleBox(spritePath);
        expect(layout.sprite.left + x1 * scale, spritePath).to.be.at.least(0);
        expect(layout.sprite.left + x2 * scale, spritePath).to.be.at.most(width);
      }
    }
  });

  it("grows level by level, because the art does", () => {
    let last = 0;
    for (let level = 1; level <= 12; level += 1) {
      const [, top, , bottom] = BearScene_visibleBox(BearArt_sprite("male", "brown", level, "normal"));
      expect(bottom - top, `level ${level}`).to.be.greaterThan(last);
      last = bottom - top;
    }
  });

  it("matches the anchors and every visible box in the brown manifest", () => {
    const m = brownManifest();
    expect(m.canvas).to.deep.equal([BearScene_canvas.width, BearScene_canvas.height]);
    expect(m.bear_foot_anchor).to.deep.equal([BearScene_spriteFoot.x, BearScene_spriteFoot.y]);
    const entries = Object.entries(m.assets);
    expect(entries.length).to.equal(24);
    for (const [name, asset] of entries) {
      const spritePath = `/images/bear/brown/${name
        .replace(/^bear_/, "")
        .replace(/\.png$/, "")
        .replace(/_/g, "-")}.webp`;
      expect(BearScene_visibleBox(spritePath), name).to.deep.equal(asset.visible_bbox);
      expect(asset.visible_height, name).to.equal(BearScene_spriteFoot.y - asset.visible_bbox[1]);
    }
  });

  it("has a box for every sprite path the app asks for, for every line and fur", () => {
    for (const line of ["male", "female"] as const) {
      for (const fur of ["brown", "black", "polar"] as const) {
        for (let level = 1; level <= 12; level += 1) {
          for (const mood of moods) {
            const box: IBearRect = BearScene_visibleBox(BearArt_sprite(line, fur, level, mood));
            expect(box[2]).to.be.lessThan(1024);
            expect(box[3] - box[1]).to.be.lessThan(1536);
          }
        }
      }
    }
  });

  it("fits the visible body to a height", () => {
    const crop = BearScene_bodyCrop("/images/bear/brown/level-01.webp", 145);
    expect(crop.width).to.equal(88.5);
    expect(crop.image).to.deep.equal({ left: -83.7, top: -222.5, width: 256, height: 384 });
  });

  it("frames the top of the visible box for the head", () => {
    const crop = BearScene_headCrop("/images/bear/brown/level-01.webp", 56);
    const side = (1470 - 890) * 0.42;
    expect(crop.width).to.be.closeTo((1024 * 56) / side, 0.1);
    expect(crop.top).to.be.lessThan(0);
    expect(-crop.left + 28).to.be.closeTo(((335 + 689) / 2) * (56 / side), 0.2);
  });

  it("keeps the head crop square inside the canvas, and over the helmet at levels 10 to 12", () => {
    for (const spritePath of spritePaths()) {
      const [x1, y1, x2, y2] = BearScene_visibleBox(spritePath);
      const side = (y2 - y1) * 0.42;
      const left = (x1 + x2) / 2 - side / 2;
      expect(left, spritePath).to.be.at.least(0);
      expect(left + side, spritePath).to.be.at.most(BearScene_canvas.width);
    }
    const helmetWidths: Record<number, number> = { 10: 515, 11: 525, 12: 570 };
    for (const level of [10, 11, 12]) {
      const [, y1, , y2] = BearScene_visibleBox(BearArt_sprite("male", "brown", level, "normal"));
      expect((y2 - y1) * 0.42, `level ${level}`).to.be.at.least(helmetWidths[level]);
    }
  });

  it("puts the bear in the gym while a workout runs and at home the rest of the time", () => {
    expect(BearScene_place(true)).to.equal("gym");
    expect(BearScene_place(false)).to.equal("home");
  });
});

describe("BearScene on the tall canvas", () => {
  it("draws the bear at the same size and 448 rows lower than on the old gym picture", () => {
    const old = BearScene_layout(1024, BearScene_gymArt);
    const tall = BearScene_layout(1024, HouseFrame_gymArt);
    expect(tall.height).to.equal(2304);
    expect(tall.sprite.width).to.equal(old.sprite.width);
    expect(tall.sprite.height).to.equal(old.sprite.height);
    expect(tall.sprite.left).to.equal(old.sprite.left);
    expect(tall.sprite.top).to.be.closeTo(old.sprite.top + HouseFrame_oldTop, 0.1);
    expect(tall.board.top).to.equal(old.board.top + HouseFrame_oldTop);
    expect(BearScene_gymFoot.y).to.equal(1490);
    expect(BearScene_dashboardRect[1]).to.equal(195);
  });
});
