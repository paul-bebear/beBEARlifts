import "mocha";
import { expect } from "chai";
import { BearArt_gym, BearArt_scale, BearArt_sprite } from "../src/models/bearArt";

describe("BearArt", () => {
  for (const line of ["male", "female"] as const) {
    it(`uses numbered level sprites for the ${line} line`, () => {
      for (let level = 1; level <= 12; level += 1) {
        expect(BearArt_sprite(line, level, "normal")).to.equal(
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
          expect(BearArt_sprite(line, index + 1, mood)).to.equal(`/images/bear/${line}/mood-${size}-${mood}.webp`);
        });
      });
    }
  }

  it("maps every gym band, including each space level", () => {
    const gyms = [
      "bedroom",
      "bedroom",
      "bedroom",
      "garage",
      "garage",
      "garage",
      "pro",
      "pro",
      "pro",
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
});
