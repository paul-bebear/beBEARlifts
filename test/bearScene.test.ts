import "mocha";
import { expect } from "chai";
import * as fs from "fs";
import * as path from "path";
import {
  BearScene_bodyCrop,
  BearScene_canvas,
  BearScene_dashboardRect,
  BearScene_gymFoot,
  BearScene_headCrop,
  BearScene_layout,
  BearScene_spriteFoot,
  BearScene_spriteScale,
  BearScene_visibleBox,
} from "../src/models/bearScene";
import { BearArt_sprite } from "../src/models/bearArt";

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
  it("matches the anchors in the male manifest", () => {
    const m = manifest("male") as Record<string, unknown>;
    const placement = m.scene_placement as { scale: number; full_canvas_top_left: number[]; foot_anchor: number[] };
    expect(m.canvas).to.deep.equal([BearScene_canvas.width, BearScene_canvas.height]);
    expect(m.bear_foot_anchor).to.deep.equal([BearScene_spriteFoot.x, BearScene_spriteFoot.y]);
    expect(placement.scale).to.equal(BearScene_spriteScale);
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

  it("places the full sprite canvas at the manifest's top left at full size", () => {
    const layout = BearScene_layout(1024, 1);
    expect([layout.width, layout.height]).to.deep.equal([1024, 1536]);
    expect([layout.sprite.left, layout.sprite.top]).to.deep.equal([266.2, 784.4]);
    expect([layout.sprite.width, layout.sprite.height]).to.deep.equal([491.5, 737.3]);
    expect(layout.board).to.deep.equal({ left: 125, top: 195, width: 700, height: 480 });
  });

  it("keeps the feet on the floor anchor when the bear is smaller early in a level", () => {
    for (const fraction of [0, 0.5, 1]) {
      const layout = BearScene_layout(390, fraction);
      const footX = layout.sprite.left + (layout.sprite.width * BearScene_spriteFoot.x) / BearScene_canvas.width;
      const footY = layout.sprite.top + (layout.sprite.height * BearScene_spriteFoot.y) / BearScene_canvas.height;
      expect(footX).to.be.closeTo((390 * 512) / 1024, 0.2);
      expect(footY).to.be.closeTo((390 * 1490) / 1024, 0.2);
    }
    expect(BearScene_layout(390, 0).sprite.width).to.be.lessThan(BearScene_layout(390, 1).sprite.width);
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
