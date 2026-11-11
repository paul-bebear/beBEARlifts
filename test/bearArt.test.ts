import "mocha";
import { expect } from "chai";
import * as fs from "fs";
import * as path from "path";
import {
  BearArt_cardSprite,
  BearArt_furColor,
  BearArt_gym,
  BearArt_liftingSizes,
  BearArt_sprite,
} from "../src/models/bearArt";
import { IBearFur, IBearLine } from "../src/models/bearStoreData";

const lines: IBearLine[] = ["male", "female"];
const furs: IBearFur[] = ["brown", "black", "polar"];
const sizes = ["small", "small", "small", "medium", "medium", "medium", "big", "big", "big", "space", "space", "space"];

describe("BearArt", () => {
  it("uses numbered level sprites from the brown folder for every line and fur", () => {
    for (const line of lines) {
      for (const fur of furs) {
        for (let level = 1; level <= 12; level += 1) {
          expect(BearArt_sprite(line, fur, level, "normal")).to.equal(
            `/images/bear/brown/level-${String(level).padStart(2, "0")}.webp`
          );
        }
      }
    }
  });

  for (const mood of ["hungry", "tired", "pumped"] as const) {
    it(`maps every level to a ${mood} size in the brown folder for every line and fur`, () => {
      for (const line of lines) {
        for (const fur of furs) {
          sizes.forEach((size, index) => {
            expect(BearArt_sprite(line, fur, index + 1, mood)).to.equal(`/images/bear/brown/mood-${size}-${mood}.webp`);
          });
        }
      }
    });
  }

  it("ships no lifting pose, so every card shows the pumped roar", () => {
    expect(BearArt_liftingSizes).to.deep.equal([]);
    sizes.forEach((size, index) => {
      for (const line of lines) {
        expect(BearArt_cardSprite(line, "brown", index + 1)).to.equal(`/images/bear/brown/mood-${size}-pumped.webp`);
      }
    });
  });

  it("shows a lifting pose on cards for the listed sizes only", () => {
    const listed = ["medium", "space"] as const;
    expect(BearArt_cardSprite("female", "brown", 5, listed)).to.equal("/images/bear/brown/lift-medium.webp");
    expect(BearArt_cardSprite("male", "brown", 8, listed)).to.equal("/images/bear/brown/mood-big-pumped.webp");
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

  it("ships a webp for every gym the tiers name", () => {
    for (let level = 1; level <= 12; level += 1) {
      const file = path.join(__dirname, "..", BearArt_gym(level));
      expect(fs.existsSync(file), file).to.equal(true);
    }
  });

  it("ships a webp for every sprite path the app asks for", () => {
    for (let level = 1; level <= 12; level += 1) {
      for (const mood of ["normal", "hungry", "tired", "pumped"] as const) {
        const file = path.join(__dirname, "..", BearArt_sprite("male", "brown", level, mood));
        expect(fs.existsSync(file), file).to.equal(true);
      }
    }
  });

  it("tints the logo mark for black and polar only", () => {
    expect(BearArt_furColor("brown", "#fff")).to.equal("#fff");
    expect(BearArt_furColor(undefined, "#fff")).to.equal("#fff");
    expect(BearArt_furColor("black", "#fff")).to.not.equal("#fff");
    expect(BearArt_furColor("polar", "#fff")).to.not.equal(BearArt_furColor("black", "#fff"));
  });
});
