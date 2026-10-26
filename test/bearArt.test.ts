import "mocha";
import { expect } from "chai";
import * as fs from "fs";
import * as path from "path";
import {
  BearArt_cardSprite,
  BearArt_furColor,
  BearArt_gym,
  BearArt_liftingSizes,
  BearArt_scale,
  BearArt_sprite,
} from "../src/models/bearArt";

describe("BearArt", () => {
  for (const line of ["male", "female"] as const) {
    it(`uses numbered level sprites for the ${line} line`, () => {
      for (let level = 1; level <= 12; level += 1) {
        expect(BearArt_sprite(line, "brown", level, "normal")).to.equal(
          `/images/bear/${line}/level-${String(level).padStart(2, "0")}.webp`
        );
      }
    });

    for (const mood of ["hungry", "tired", "pumped"] as const) {
      it(`maps every level to a ${line} ${mood} size`, () => {
        const sizes = [
          "small",
          "small",
          "small",
          "medium",
          "medium",
          "medium",
          "big",
          "big",
          "big",
          "space",
          "space",
          "space",
        ];
        sizes.forEach((size, index) => {
          expect(BearArt_sprite(line, "brown", index + 1, mood)).to.equal(
            `/images/bear/${line}/mood-${size}-${mood}.webp`
          );
        });
      });
    }
  }

  it("shows the lifting pose on cards at every size", () => {
    expect(BearArt_liftingSizes).to.deep.equal(["small", "medium", "big", "space"]);
    expect(BearArt_cardSprite("male", "brown", 2)).to.equal("/images/bear/male/lift-small.webp");
    expect(BearArt_cardSprite("female", "brown", 11)).to.equal("/images/bear/female/lift-space.webp");
  });

  it("falls back to the pumped flex for a size with no lifting art", () => {
    expect(BearArt_cardSprite("male", "brown", 2, [])).to.equal("/images/bear/male/mood-small-pumped.webp");
  });

  it("shows the lifting pose on cards for the listed sizes only", () => {
    const sizes = ["medium", "space"] as const;
    expect(BearArt_cardSprite("female", "brown", 5, sizes)).to.equal("/images/bear/female/lift-medium.webp");
    expect(BearArt_cardSprite("male", "brown", 12, sizes)).to.equal("/images/bear/male/lift-space.webp");
    expect(BearArt_cardSprite("male", "brown", 8, sizes)).to.equal("/images/bear/male/mood-big-pumped.webp");
  });

  it("maps every gym band, including each space level", () => {
    const gyms = [
      "trailer-park",
      "trailer-park",
      "trailer-park",
      "discount-gym",
      "discount-gym",
      "luxury-club",
      "luxury-club",
      "mansion-gym",
      "mansion-gym",
      "spaceship",
      "moon",
      "mars",
    ];
    expect(gyms.map((_, index) => BearArt_gym(index + 1))).to.deep.equal(
      gyms.map((gym) => `/images/bear/gyms/${gym}.webp`)
    );
  });

  it("grows from 0.85 to 1.0 and clamps fractions", () => {
    expect(BearArt_scale(0)).to.equal(0.85);
    expect(BearArt_scale(0.5)).to.be.closeTo(0.925, 0.00001);
    expect(BearArt_scale(1)).to.equal(1);
    expect(BearArt_scale(-1)).to.equal(0.85);
    expect(BearArt_scale(2)).to.equal(1);
  });

  it("ships a webp for every gym the tiers name", () => {
    for (let level = 1; level <= 12; level += 1) {
      const file = path.join(__dirname, "..", BearArt_gym(level));
      expect(fs.existsSync(file), file).to.equal(true);
    }
  });

  describe("fur", () => {
    for (const line of ["male", "female"] as const) {
      it(`keeps the old ${line} folder for brown`, () => {
        expect(BearArt_sprite(line, "brown", 1, "normal")).to.equal(`/images/bear/${line}/level-01.webp`);
        expect(BearArt_cardSprite(line, "brown", 2)).to.equal(`/images/bear/${line}/lift-small.webp`);
      });

      for (const fur of ["black", "polar"] as const) {
        it(`reads the ${line}-${fur} folder for ${fur}`, () => {
          expect(BearArt_sprite(line, fur, 12, "normal")).to.equal(`/images/bear/${line}-${fur}/level-12.webp`);
          expect(BearArt_sprite(line, fur, 4, "tired")).to.equal(`/images/bear/${line}-${fur}/mood-medium-tired.webp`);
          expect(BearArt_cardSprite(line, fur, 11)).to.equal(`/images/bear/${line}-${fur}/lift-space.webp`);
          expect(BearArt_cardSprite(line, fur, 2, [])).to.equal(`/images/bear/${line}-${fur}/mood-small-pumped.webp`);
        });

        it(`ships all 28 ${line}-${fur} sprites that the brown ${line} folder has`, () => {
          const read = (folder: string): string[] =>
            fs.readdirSync(path.join(__dirname, "..", "images", "bear", folder)).sort();
          expect(read(`${line}-${fur}`)).to.deep.equal(read(line));
        });
      }
    }

    it("tints the logo mark for black and polar only", () => {
      expect(BearArt_furColor("brown", "#fff")).to.equal("#fff");
      expect(BearArt_furColor(undefined, "#fff")).to.equal("#fff");
      expect(BearArt_furColor("black", "#fff")).to.not.equal("#fff");
      expect(BearArt_furColor("polar", "#fff")).to.not.equal(BearArt_furColor("black", "#fff"));
    });
  });
});
