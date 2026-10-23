import "mocha";
import { expect } from "chai";
import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { BearLevelUpArt_image } from "../src/models/bearLevelUpArt";

describe("BearLevelUpArt_image", () => {
  for (const line of ["male", "female"] as const) {
    it(`has no celebration for ${line} level 1`, () => {
      expect(BearLevelUpArt_image(line, 1)).to.equal(undefined);
    });

    for (const level of [2, 12]) {
      it(`finds the ${line} level ${level} picture`, () => {
        expect(BearLevelUpArt_image(line, level)).to.equal(
          `/images/bear/${line}/levelup-${String(level).padStart(2, "0")}.webp`
        );
      });
    }
  }

  it("has all 22 pictures and native bundle entries", () => {
    const native = readFileSync(join(__dirname, "../src/utils/levelUpImage.native.ts"), "utf8");
    for (const line of ["male", "female"] as const) {
      for (let level = 2; level <= 12; level += 1) {
        const image = BearLevelUpArt_image(line, level)!;
        expect(existsSync(join(__dirname, "..", image)), image).to.equal(true);
        expect(native).to.contain(`require("../..${image}")`);
      }
    }
  });

  it("has no picture for an unknown level", () => {
    for (const level of [0, -1, 2.5, 13, NaN, Infinity]) {
      expect(BearLevelUpArt_image("male", level)).to.equal(undefined);
    }
  });
});
