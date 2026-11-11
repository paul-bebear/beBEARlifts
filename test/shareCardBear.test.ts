import "mocha";
import { expect } from "chai";
import * as fs from "fs";
import * as path from "path";
import { ShareCardBear_cropTop, ShareCardBear_frame } from "../src/models/shareCardBear";

describe("ShareCardBear", () => {
  it("cuts the empty canvas above a small bear, so the cub fills the frame", () => {
    expect(ShareCardBear_frame("small", 280)).to.deep.equal({
      width: 287,
      height: 280,
      imageWidth: 287,
      imageHeight: 431,
      imageCrop: 151,
    });
  });

  it("shows almost the whole canvas for a space bear", () => {
    expect(ShareCardBear_frame("space", 300)).to.deep.equal({
      width: 201,
      height: 300,
      imageWidth: 201,
      imageHeight: 302,
      imageCrop: 2,
    });
  });

  it("keeps the feet on the frame's bottom edge for every size", () => {
    for (const size of ["small", "medium", "big", "space"] as const) {
      const frame = ShareCardBear_frame(size, 240);
      expect(Math.abs(frame.imageHeight - frame.imageCrop - frame.height), size).to.be.at.most(1);
      expect(frame.width, size).to.be.at.most(360);
    }
  });

  it("cuts above the roar of every size and never into it", () => {
    const file = path.join(__dirname, "..", "images", "bear", "brown", "manifest.json");
    const assets: Record<string, { visible_bbox: number[] }> = JSON.parse(fs.readFileSync(file, "utf8")).assets;
    for (const size of ["small", "medium", "big", "space"] as const) {
      const roarTop = assets[`bear_mood_${size}_pumped.png`].visible_bbox[1];
      const cutRows = ShareCardBear_cropTop[size] * 1536;
      expect(cutRows, size).to.be.at.most(roarTop);
      expect(roarTop - cutRows, `${size} margin`).to.be.at.most(30);
    }
  });
});
